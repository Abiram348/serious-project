import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import Stripe from 'stripe';
import { z } from 'zod';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-15' as any,
});

// Get available plans
router.get('/plans', async (req, res) => {
  const plans = [
    {
      id: 'FREE',
      name: 'Free',
      price: 0,
      projects: 3,
      tokensPerMonth: 100000,
      parallelAgents: 2,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 29,
      projects: -1, // unlimited
      tokensPerMonth: 2000000,
      parallelAgents: 5,
    },
    {
      id: 'TEAM',
      name: 'Team',
      price: 99,
      projects: -1,
      tokensPerMonth: 10000000,
      parallelAgents: 9,
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 'Custom',
      projects: -1,
      tokensPerMonth: -1,
      parallelAgents: -1,
    },
  ];

  res.json(plans);
});

// Get current subscription
router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser.id;

    const userRecord = await db.user.findFirst({ where: { id: userId } });
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: userRecord.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      plan: userRecord.plan,
      credits: userRecord.credits,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create checkout session
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser.id;
    const { planId, priceId } = req.body;

    const userRecord = await db.user.findFirst({ where: { id: userId } });
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: userRecord.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_API_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/dashboard/billing?canceled=true`,
      metadata: {
        userId: userRecord.clerkId,
        planId,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create billing portal session
router.post('/portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser.id;

    const userRecord = await db.user.findFirst({ where: { id: userId } });
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = userRecord.clerkId; // Use clerkId as customer reference

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_API_URL}/dashboard/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get usage stats
router.get('/usage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser.id;

    const userRecord = await db.user.findFirst({ where: { id: userId } });
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current month usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageRows = await db.usageLog.findMany({
      where: {
        userId: userRecord.id,
        createdAt: { gte: startOfMonth },
      },
    });

    const totalTokensIn = usageRows.reduce((sum, log) => sum + (log.tokensIn ?? 0), 0);
    const totalTokensOut = usageRows.reduce((sum, log) => sum + (log.tokensOut ?? 0), 0);
    const totalCost = usageRows.reduce((sum, log) => sum + (log.cost ?? 0), 0);

    res.json({
      plan: userRecord.plan,
      credits: userRecord.credits,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      totalCost,
      periodStart: startOfMonth.toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completed:', session.id);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;
