'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out SwarmDev',
    features: ['3 projects', '100K tokens/month', '2 parallel agents', 'Community support'],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$29',
    description: 'For professional developers',
    features: ['Unlimited projects', '2M tokens/month', '5 parallel agents', 'Priority support', 'Advanced features'],
    popular: true,
  },
  {
    id: 'TEAM',
    name: 'Team',
    price: '$99',
    description: 'For growing teams',
    features: ['Unlimited projects', '10M tokens/month', '9 parallel agents', 'Team collaboration', 'SSO authentication'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: ['Unlimited everything', 'Custom token limits', 'Dedicated support', 'SLA', 'On-premise deployment'],
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState('FREE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/billing/subscription');
        if (res.ok) {
          const data = await res.json();
          setCurrentPlan(data.plan || 'FREE');
        } else {
          const profile = await fetch('/api/user/profile');
          if (profile.ok) {
            const p = await profile.json();
            setCurrentPlan(p.plan || 'FREE');
          }
        }
      } catch {
        // keep default
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your subscription and usage</p>
      </div>

      <Separator />

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your current subscription</CardDescription>
            </div>
            <Badge>{loading ? '…' : currentPlan}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {plans.find((p) => p.id === currentPlan)?.price || '$0'}
            <span className="text-base font-normal text-muted-foreground">/month</span>
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">Manage Subscription</Button>
        </CardFooter>
      </Card>

      {/* Available Plans */}
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.popular ? 'border-primary shadow-lg' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && <Badge variant="default">Popular</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">
                {plan.price}
                {plan.price !== 'Custom' && <span className="text-base font-normal text-muted-foreground">/mo</span>}
              </p>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.id === currentPlan ? 'outline' : 'default'}
                disabled={plan.id === currentPlan}
              >
                {plan.id === currentPlan ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
