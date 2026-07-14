export interface Subscriber {
  id: number;
  email: string;
  subscribedAt: string;
  source: string;
}

export interface SubscribersResponse {
  page: number;
  limit: number;
  total: number;
  subscribers: Subscriber[];
}
