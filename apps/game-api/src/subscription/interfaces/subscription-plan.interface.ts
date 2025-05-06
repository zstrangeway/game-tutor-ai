export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: 'monthly' | 'yearly';
  currency: string;
  features?: string[];
  stripePriceId: string;
  isActive: boolean;
}
