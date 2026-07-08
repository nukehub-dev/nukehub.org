import * as React from "react";
import { fetchStats, fetchSubmissions, fetchSurveys } from "../lib/admin-api";
import type { SubmissionsResponse, SurveyStats, SurveySummary } from "../types";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useSurveys(token: string | null): AsyncState<SurveySummary[]> {
  const [state, setState] = React.useState<AsyncState<SurveySummary[]>>({
    data: null,
    error: null,
    isLoading: true,
  });

  React.useEffect(() => {
    if (!token) {
      setState({ data: null, error: null, isLoading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, isLoading: true });

    fetchSurveys(token)
      .then((result) => {
        if (controller.signal.aborted) return;
        setState({ data: result.surveys, error: null, isLoading: false });
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
  }, [token]);

  return state;
}

export function useSubmissions(
  token: string | null,
  slug: string,
  page = 1,
  limit = 50,
): AsyncState<SubmissionsResponse> {
  const [state, setState] = React.useState<AsyncState<SubmissionsResponse>>({
    data: null,
    error: null,
    isLoading: true,
  });

  React.useEffect(() => {
    if (!token || !slug) {
      setState({ data: null, error: null, isLoading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, isLoading: true });

    fetchSubmissions(token, slug, page, limit)
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
  }, [token, slug, page, limit]);

  return state;
}

export function useStats(
  token: string | null,
  slug: string,
): AsyncState<SurveyStats> {
  const [state, setState] = React.useState<AsyncState<SurveyStats>>({
    data: null,
    error: null,
    isLoading: true,
  });

  React.useEffect(() => {
    if (!token || !slug) {
      setState({ data: null, error: null, isLoading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, isLoading: true });

    fetchStats(token, slug)
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
  }, [token, slug]);

  return state;
}
