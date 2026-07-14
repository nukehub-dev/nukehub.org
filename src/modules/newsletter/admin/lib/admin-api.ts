import type {
  Campaign,
  CampaignInput,
  CampaignsResponse,
  NewsletterStats,
  SubscribersResponse,
} from "../types";

const API_BASE = import.meta.env.PUBLIC_API_URL || "/api";

function getBaseUrl(): string {
  // Admin endpoints live under the API origin.
  // PUBLIC_API_URL is e.g. https://api.nukehub.org
  // so the newsletter admin base is https://api.nukehub.org/admin/newsletter
  return `${API_BASE.replace(/\/$/, "")}/admin/newsletter`;
}

async function fetchJson<T>(token: string | null, path: string): Promise<T> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.error === "string"
        ? data.error
        : `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export interface SubscriberFilters {
  q?: string;
  source?: string;
}

export function fetchSubscribers(
  token: string | null,
  page = 1,
  limit = 50,
  filters: SubscriberFilters = {},
): Promise<SubscribersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.source) params.set("source", filters.source);
  return fetchJson(token, `/subscribers?${params.toString()}`);
}

export function bulkDeleteSubscribers(
  token: string | null,
  ids: number[],
): Promise<{ success: boolean; deleted: number }> {
  return mutateJson(token, "/subscribers", "DELETE", { ids });
}

export function getExportUrl(): string {
  return `${getBaseUrl()}/subscribers/export.csv`;
}

export async function fetchExportCsv(token: string | null): Promise<Blob> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(getExportUrl(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/csv",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.error === "string"
        ? data.error
        : `Export failed (${response.status})`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export async function deleteSubscriber(
  token: string | null,
  id: number,
): Promise<{ success: boolean; deleted: number }> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getBaseUrl()}/subscribers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.error === "string"
        ? data.error
        : `Delete failed (${response.status})`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<{ success: boolean; deleted: number }>;
}

async function mutateJson<T>(
  token: string | null,
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.error === "string"
        ? data.error
        : `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function fetchCampaigns(
  token: string | null,
): Promise<CampaignsResponse> {
  return fetchJson(token, "/campaigns");
}

export function createCampaign(
  token: string | null,
  input: CampaignInput,
): Promise<Campaign> {
  return mutateJson(token, "/campaigns", "POST", input);
}

export function updateCampaign(
  token: string | null,
  id: number,
  input: CampaignInput,
): Promise<Campaign> {
  return mutateJson(token, `/campaigns/${id}`, "PUT", input);
}

export function deleteCampaign(
  token: string | null,
  id: number,
): Promise<{ success: boolean; deleted: number }> {
  return mutateJson(token, `/campaigns/${id}`, "DELETE");
}

export function sendCampaign(
  token: string | null,
  id: number,
): Promise<{ success: boolean; status: string; total: number }> {
  return mutateJson(token, `/campaigns/${id}/send`, "POST");
}

export function testCampaign(
  token: string | null,
  id: number,
  email: string,
): Promise<{ success: boolean; message: string }> {
  return mutateJson(token, `/campaigns/${id}/test`, "POST", { email });
}

export function previewCampaign(
  token: string | null,
  bodyMarkdown: string,
): Promise<{ html: string }> {
  return mutateJson(token, "/campaigns/preview", "POST", { bodyMarkdown });
}

export interface NewsletterConfig {
  fromName: string;
  fromAddresses: string[];
}

export function fetchNewsletterConfig(
  token: string | null,
): Promise<NewsletterConfig> {
  return fetchJson(token, "/config");
}

export function fetchNewsletterStats(
  token: string | null,
): Promise<NewsletterStats> {
  return fetchJson(token, "/stats");
}
