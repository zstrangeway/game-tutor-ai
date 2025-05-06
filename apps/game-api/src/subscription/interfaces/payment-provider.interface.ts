export interface PaymentProviderCustomer {
  id: string;
  email: string;
  name: string;
}

export interface PaymentProviderSubscription {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentProviderEvent {
  type: string;
  data: any;
}
