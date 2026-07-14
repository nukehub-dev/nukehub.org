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
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  stats: CampaignStats;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
}

export interface CampaignInput {
  title: string;
  subject: string;
  fromEmail: string;
  bodyMarkdown: string;
}
