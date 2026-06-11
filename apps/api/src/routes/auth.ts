import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';

const router = Router();

// Get current authenticated user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { userId, sessionId } = (req as any).auth;
  res.json({ userId, sessionId });
});

// Clerk webhook handler (Issue #11)
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Clerk webhook secret not configured' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  const wh = new Webhook(webhookSecret);

  let evt: any;
  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  const eventType: string = evt.type;

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        await db.user.create({
          data: {
            clerkId: id,
            email: email_addresses[0].email_address,
            name: `${first_name || ''} ${last_name || ''}`.trim() || null,
            avatarUrl: image_url || null,
          },
        });
        console.log(`✅ Created user: ${id}`);
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        await db.user.update({
          where: { clerkId: id },
          data: {
            email: email_addresses[0]?.email_address,
            name: `${first_name || ''} ${last_name || ''}`.trim() || null,
            avatarUrl: image_url || null,
          },
        });
        console.log(`✅ Updated user: ${id}`);
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        await db.user.delete({ where: { clerkId: id } });
        console.log(`✅ Deleted user: ${id}`);
        break;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
