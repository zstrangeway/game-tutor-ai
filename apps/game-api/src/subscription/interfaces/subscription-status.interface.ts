export type SubscriptionStatus = 'free' | 'standard' | 'premium' | 'trial';

export interface SubscriptionDetails {
  status: SubscriptionStatus;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  isActive: boolean;
}
