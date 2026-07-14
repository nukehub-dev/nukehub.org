import * as React from "react";
import {
  fetchCampaigns,
  fetchNewsletterConfig,
  fetchSubscribers,
  type NewsletterConfig,
} from "../lib/admin-api";
import type { CampaignsResponse, SubscribersResponse } from "../types";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => void;
}

function useAsyncState<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> {
  const [state, setState] = React.useState<{
    data: T | null;
    error: string | null;
    isLoading: boolean;
    refreshKey: number;
  }>({
    data: null,
    error: null,
    isLoading: true,
    refreshKey: 0,
  });

  React.useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          data: result,
          error: null,
          isLoading: false,
        }));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          data: null,
          error: err instanceof Error ? err.message : String(err),
          isLoading: false,
        }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, state.refreshKey]);

  const refresh = React.useCallback(
    () => setState((prev) => ({ ...prev, refreshKey: prev.refreshKey + 1 })),
    [],
  );

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    refresh,
  };
}

export function useSubscribers(
  token: string | null,
  page = 1,
  limit = 50,
  q = "",
  source = "",
): AsyncState<SubscribersResponse> {
  return useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      const result = await fetchSubscribers(token, page, limit, { q, source });
      if (signal.aborted) return result;
      return result;
    },
    [token, page, limit, q, source],
  );
}

export function useCampaigns(
  token: string | null,
  pollWhileSending = false,
): AsyncState<CampaignsResponse> {
  const state = useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      const result = await fetchCampaigns(token);
      if (signal.aborted) return result;
      return result;
    },
    [token],
  );

  // Re-fetch while any campaign is mid-send so progress updates live.
  const hasSending = state.data?.campaigns.some((c) => c.status === "sending");
  React.useEffect(() => {
    if (!pollWhileSending || !hasSending) return;
    const interval = setInterval(state.refresh, 5000);
    return () => clearInterval(interval);
  }, [pollWhileSending, hasSending, state.refresh]);

  return state;
}

export function useNewsletterConfig(
  token: string | null,
): AsyncState<NewsletterConfig> {
  return useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      const result = await fetchNewsletterConfig(token);
      if (signal.aborted) return result;
      return result;
    },
    [token],
  );
}
