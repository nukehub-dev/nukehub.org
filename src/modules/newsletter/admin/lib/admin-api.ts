import type { SubscribersResponse } from "../types";

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

export function fetchSubscribers(
  token: string | null,
  page = 1,
  limit = 50,
): Promise<SubscribersResponse> {
  return fetchJson(token, `/subscribers?page=${page}&limit=${limit}`);
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
