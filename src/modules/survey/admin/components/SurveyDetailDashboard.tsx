import * as React from "react";
import { ArrowLeft, BarChart3, Download, List, Trash2 } from "lucide-react";
import { useMaybeAuth } from "@lib/auth/NukeAuthProvider";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { ConfirmDialog } from "@components/ui/Dialog";
import type { Survey } from "../../types";
import { useSubmissions, useStats } from "../hooks/useSurveyAdmin";
import { deleteAllSurveySubmissions, fetchExportCsv } from "../lib/admin-api";
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
  const [activeTab, setActiveTab] = React.useState<"stats" | "responses">(
    "stats",
  );
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [clearing, setClearing] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const questionMap = React.useMemo(() => buildQuestionMap(survey), [survey]);
  const {
    data: submissionsData,
    error: submissionsError,
    isLoading: submissionsLoading,
    refresh: refreshSubmissions,
  } = useSubmissions(token, slug, page, limit);
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
    refresh: refreshStats,
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

  const totalResponses = submissionsData?.total ?? 0;

  const handleClearAll = async () => {
    if (!token) return;

    setClearing(true);
    try {
      await deleteAllSurveySubmissions(token, slug);
      refreshSubmissions();
      refreshStats();
      setPage(1);
    } catch (err) {
      console.error("Failed to clear responses:", err);
    } finally {
      setClearing(false);
    }
  };

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
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              loading={exporting}
              onClick={async () => {
                if (!token) return;
                setExporting(true);
                setExportError(null);
                try {
                  const blob = await fetchExportCsv(token, slug);
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${slug}-responses.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setExportError(
                    err instanceof Error ? err.message : "Export failed",
                  );
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download size={16} className="mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="destructive"
              loading={clearing}
              onClick={() => setShowClearDialog(true)}
              disabled={totalResponses === 0}
            >
              <Trash2 size={16} className="mr-1.5" />
              Clear all
            </Button>
          </div>
          {exportError && (
            <p className="text-sm text-destructive">{exportError}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1 border-b border-border/50">
          <TabButton
            active={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
            icon={<BarChart3 size={16} />}
            label="Statistics"
          />
          <TabButton
            active={activeTab === "responses"}
            onClick={() => setActiveTab("responses")}
            icon={<List size={16} />}
            label="Responses"
          />
        </div>

        <div className="pt-4">
          {activeTab === "stats" ? (
            statsLoading || !stats ? (
              <StatsSkeleton />
            ) : (
              <StatsPanel stats={stats} questionMap={questionMap} />
            )
          ) : (
            <SubmissionsTable
              slug={slug}
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
              token={token}
              onDeleted={() => {
                refreshSubmissions();
                refreshStats();
              }}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title="Clear all responses?"
        description={`Delete all ${totalResponses.toLocaleString()} responses for "${title}". This action cannot be undone.`}
        confirmLabel="Clear all"
        variant="destructive"
        loading={clearing}
        onConfirm={handleClearAll}
      />
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

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <Card variant="bubble" className="h-32 animate-pulse" />
      <Card variant="bubble" className="h-64 animate-pulse" />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
