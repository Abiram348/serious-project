'use client';

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
  const currentPlan = 'FREE'; // TODO: Get from user context

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
            <Badge>{currentPlan}</Badge>
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
                {plan.popular && <Badge>Most Popular</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold">
                {plan.price}
                {plan.price !== 'Custom' && <span className="text-base font-normal text-muted-foreground">/month</span>}
              </p>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-center gap-2">
                    <span className="text-green-500">✓</span>
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

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Update your payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No payment method on file. Add one when you upgrade to a paid plan.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">Add Payment Method</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
