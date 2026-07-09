import type { SubmissionsResponse, SurveyStats, SurveySummary } from "../types";

const API_BASE = import.meta.env.PUBLIC_API_URL || "/api";

function getBaseUrl(): string {
  // Admin endpoints live under the API origin.
  // PUBLIC_API_URL is e.g. https://api.nukehub.org
  // so the admin base is https://api.nukehub.org/admin
  return `${API_BASE.replace(/\/$/, "")}/admin`;
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

export function fetchSurveys(token: string | null): Promise<{
  surveys: SurveySummary[];
}> {
  return fetchJson(token, "/surveys");
}

export function fetchSubmissions(
  token: string | null,
  slug: string,
  page = 1,
  limit = 50,
): Promise<SubmissionsResponse> {
  return fetchJson(
    token,
    `/surveys/${encodeURIComponent(slug)}?page=${page}&limit=${limit}`,
  );
}

export function fetchStats(
  token: string | null,
  slug: string,
): Promise<SurveyStats> {
  return fetchJson(token, `/surveys/${encodeURIComponent(slug)}/stats`);
}

export function getExportUrl(slug: string): string {
  return `${getBaseUrl()}/surveys/${encodeURIComponent(slug)}/export.csv`;
}

export async function fetchExportCsv(
  token: string | null,
  slug: string,
): Promise<Blob> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(getExportUrl(slug), {
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

async function fetchDelete(
  token: string | null,
  path: string,
  body?: object,
): Promise<{ success: boolean; deleted: number }> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const init: RequestInit = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  };
  if (body) {
    init.headers = {
      ...init.headers,
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${getBaseUrl()}${path}`, init);
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

  return response.json() as Promise<{ success: boolean; deleted: number }>;
}

export function deleteSubmission(
  token: string | null,
  slug: string,
  id: number,
): Promise<{ success: boolean; deleted: number }> {
  return fetchDelete(
    token,
    `/surveys/${encodeURIComponent(slug)}/submissions/${id}`,
  );
}

export function deleteSubmissions(
  token: string | null,
  slug: string,
  ids: number[],
): Promise<{ success: boolean; deleted: number }> {
  return fetchDelete(
    token,
    `/surveys/${encodeURIComponent(slug)}/submissions`,
    { ids },
  );
}

export function deleteAllSurveySubmissions(
  token: string | null,
  slug: string,
): Promise<{ success: boolean; deleted: number }> {
  return fetchDelete(token, `/surveys/${encodeURIComponent(slug)}`);
}
