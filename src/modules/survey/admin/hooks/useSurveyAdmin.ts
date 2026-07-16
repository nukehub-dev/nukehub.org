import * as React from "react";
import { fetchStats, fetchSubmissions, fetchSurveys } from "../lib/admin-api";
import type { SubmissionsResponse, SurveyStats, SurveySummary } from "../types";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => void;
}

function areDepsEqual(
  a: React.DependencyList,
  b: React.DependencyList,
): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

function useAsyncState<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [state, setState] = React.useState<{
    data: T | null;
    error: string | null;
    settledFor: { deps: React.DependencyList; refreshKey: number } | null;
  }>({
    data: null,
    error: null,
    settledFor: null,
  });

  // A request is in flight until it settles for the current deps + refreshKey.
  const isLoading =
    state.settledFor === null ||
    state.settledFor.refreshKey !== refreshKey ||
    !areDepsEqual(state.settledFor.deps, deps);

  React.useEffect(() => {
    const controller = new AbortController();

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setState({
          data: result,
          error: null,
          settledFor: { deps, refreshKey },
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          error: err instanceof Error ? err.message : String(err),
          settledFor: { deps, refreshKey },
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  const refresh = React.useCallback(
    () => setRefreshKey((prev) => prev + 1),
    [],
  );

  return {
    data: state.data,
    error: isLoading ? null : state.error,
    isLoading,
    refresh,
  };
}

export function useSurveys(token: string | null): AsyncState<SurveySummary[]> {
  return useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      const result = await fetchSurveys(token);
      if (signal.aborted) return result.surveys;
      return result.surveys;
    },
    [token],
  );
}

export function useSubmissions(
  token: string | null,
  slug: string,
  page = 1,
  limit = 50,
): AsyncState<SubmissionsResponse> {
  return useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      if (!slug) throw new Error("Survey slug is required");
      const result = await fetchSubmissions(token, slug, page, limit);
      if (signal.aborted) return result;
      return result;
    },
    [token, slug, page, limit],
  );
}

export function useStats(
  token: string | null,
  slug: string,
): AsyncState<SurveyStats> {
  return useAsyncState(
    async (signal) => {
      if (!token) throw new Error("Not authenticated");
      if (!slug) throw new Error("Survey slug is required");
      const result = await fetchStats(token, slug);
      if (signal.aborted) return result;
      return result;
    },
    [token, slug],
  );
}
