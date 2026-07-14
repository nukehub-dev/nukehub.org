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
  sources: string[];
}

export type CampaignStatus = "draft" | "sending" | "sent";

export interface CampaignStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
}

export interface Campaign {
  id: number;
  title: string;
  subject: string;
  fromEmail: string;
  bodyMarkdown: string;
  status: CampaignStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  stats: CampaignStats;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
}

export interface NewsletterStats {
  total: number;
  daily: Record<string, number>;
  sources: { value: string; count: number }[];
  campaigns: { total: number; draft: number; sending: number; sent: number };
  deliveries: { total: number; sent: number; failed: number };
}

export interface CampaignInput {
  title: string;
  subject: string;
  fromEmail: string;
  bodyMarkdown: string;
}
