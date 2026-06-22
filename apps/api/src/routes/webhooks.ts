import { Router, Request, Response, raw } from 'express';
import { Webhook } from 'svix';
import db from '../prisma/client';

const router = Router();

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

/**
 * Clerk webhook receiver. Syncs user create/update/delete events to the
 * Prisma User table so the API has a current record for every Clerk user.
 *
 * Configure the endpoint URL in the Clerk dashboard:
 *   https://<your-api-host>/api/webhooks/clerk
 *
 * Required env: CLERK_WEBHOOK_SECRET (the signing secret from Clerk).
 */
router.post(
  '/clerk',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    if (!CLERK_WEBHOOK_SECRET) {
      console.warn('[webhooks/clerk] CLERK_WEBHOOK_SECRET not set; rejecting');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const svixId = req.header('svix-id');
    const svixTimestamp = req.header('svix-timestamp');
    const svixSignature = req.header('svix-signature');
    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    let payload: any;
    try {
      payload = wh.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      console.warn('[webhooks/clerk] signature verification failed:', (err as Error).message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { type, data } = payload || {};
    try {
      switch (type) {
        case 'user.created':
        case 'user.updated': {
          const clerkId: string | undefined = data?.id;
          const email: string | undefined =
            data?.email_addresses?.[0]?.email_address || data?.primary_email_address?.email_address;
          if (!clerkId) {
            return res.status(400).json({ error: 'Missing user id' });
          }
          await db.user.upsert({
            where: { clerkId },
            create: {
              clerkId,
              email: email || `${clerkId}@clerk.user`,
              ...(data?.first_name || data?.last_name
                ? { name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null }
                : {}),
            },
            update: {
              ...(email ? { email } : {}),
              ...(data?.first_name || data?.last_name
                ? { name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null }
                : {}),
            },
          });
          break;
        }
        case 'user.deleted': {
          const clerkId: string | undefined = data?.id;
          if (!clerkId) {
            return res.status(400).json({ error: 'Missing user id' });
          }
          // Soft delete: mark email prefixed so the row is no longer
          // referenced. Hard-deleting cascades through Project and breaks
          // audit history. Adjust if you really want hard delete.
          await db.user
            .update({ where: { clerkId }, data: { email: `deleted-${clerkId}@removed` } })
            .catch(() => {
              // User may not exist yet — that's fine.
            });
          break;
        }
        default:
          // No-op for events we don't care about (session.*, organization.*, etc.)
          break;
      }
    } catch (err) {
      console.error('[webhooks/clerk] handler error:', err);
      // Return 500 so Clerk retries — better than silently dropping user state.
      return res.status(500).json({ error: 'Handler error' });
    }

    res.json({ received: true });
  }
);

export default router;