import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = user.subscriptions[0];

    res.json({
      plan: user.plan,
      credits: user.credits,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
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
        userId: user.clerkId,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = user.clerkId; // Use clerkId as customer reference

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current month usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageLogs = await prisma.usageLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startOfMonth },
      },
    });

    const totalTokensIn = usageLogs.reduce((sum: number, log) => sum + log.tokensIn, 0);
    const totalTokensOut = usageLogs.reduce((sum: number, log) => sum + log.tokensOut, 0);
    const totalCost = usageLogs.reduce((sum: number, log) => sum + log.cost, 0);

    res.json({
      plan: user.plan,
      credits: user.credits,
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

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Update user's subscription
        console.log('Checkout completed:', session.id);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Update subscription status
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
