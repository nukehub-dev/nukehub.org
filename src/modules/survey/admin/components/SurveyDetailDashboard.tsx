import * as React from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useMaybeAuth } from "@lib/auth/NukeAuthProvider";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import type { Survey } from "../../types";
import { useSubmissions, useStats } from "../hooks/useSurveyAdmin";
import { getExportUrl } from "../lib/admin-api";
import { buildQuestionMap } from "../lib/survey-metadata";
import { SubmissionsTable } from "./SubmissionsTable";
import { StatsPanel } from "./StatsPanel";

interface SurveyDetailDashboardProps {
  slug: string;
  title: string;
  survey?: Survey;
}

export function SurveyDetailDashboard({
  slug,
  title,
  survey,
}: SurveyDetailDashboardProps) {
  const auth = useMaybeAuth();
  const token = auth?.token ?? null;
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const questionMap = React.useMemo(() => buildQuestionMap(survey), [survey]);
  const {
    data: submissionsData,
    error: submissionsError,
    isLoading: submissionsLoading,
  } = useSubmissions(token, slug, page, limit);
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useStats(token, slug);

  if (!auth || auth.isLoading) {
    return <DetailSkeleton />;
  }

  if (!auth.isAuthenticated) {
    return (
      <Card variant="bubble" className="p-8 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Admin sign-in required
        </h2>
        <p className="mt-2 text-muted-foreground">
          Sign in to view survey responses.
        </p>
        <Button onClick={auth.login} className="mt-6">
          Sign in
        </Button>
      </Card>
    );
  }

  const error = submissionsError || statsError;
  if (error) {
    return (
      <Card variant="bubble" className="p-8 text-center text-destructive">
        <p>{error}</p>
      </Card>
    );
  }

  if (statsLoading) {
    return <DetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/admin/surveys"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} />
            Back to surveys
          </a>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">Slug: {slug}</p>
        </div>
        <a href={getExportUrl(slug)} download>
          <Button variant="outline">
            <Download size={16} className="mr-1.5" />
            Export CSV
          </Button>
        </a>
      </div>

      {stats && <StatsPanel stats={stats} questionMap={questionMap} />}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Responses
        </h2>
        <SubmissionsTable
          submissions={submissionsData?.submissions ?? []}
          page={submissionsData?.page ?? 1}
          limit={submissionsData?.limit ?? limit}
          total={submissionsData?.total ?? 0}
          questionMap={questionMap}
          isLoading={submissionsLoading}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-1/3 rounded bg-muted" />
      <Card variant="bubble" className="h-32 animate-pulse" />
      <Card variant="bubble" className="h-64 animate-pulse" />
    </div>
  );
}
