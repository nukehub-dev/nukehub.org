import * as React from "react";
import {
  fetchCampaigns,
  fetchNewsletterConfig,
  fetchNewsletterStats,
  fetchSubscribers,
  type NewsletterConfig,
} from "../lib/admin-api";
import type {
  CampaignsResponse,
  NewsletterStats,
  SubscribersResponse,
} from "../types";

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
  }>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Identity of the current request; a new key means a fetch is needed.
  const requestKey = JSON.stringify([...deps, refreshKey]);

  // Mark the request as loading during render when its key changes, so the
  // effect below only talks to the external system (the network).
  const [prevRequestKey, setPrevRequestKey] = React.useState(requestKey);
  if (prevRequestKey !== requestKey) {
    setPrevRequestKey(requestKey);
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
  }

  React.useEffect(() => {
    const controller = new AbortController();

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setState({ data: result, error: null, isLoading: false });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          error: err instanceof Error ? err.message : String(err),
          isLoading: false,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const refresh = React.useCallback(() => setRefreshKey((key) => key + 1), []);

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

export function useNewsletterStats(
  token: string | null,
): AsyncState<NewsletterStats> {
  return useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      const result = await fetchNewsletterStats(token);
      if (signal.aborted) return result;
      return result;
    },
    [token],
  );
}
