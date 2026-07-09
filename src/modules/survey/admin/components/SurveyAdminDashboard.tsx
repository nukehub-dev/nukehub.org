import * as React from "react";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Clock,
  Inbox,
} from "lucide-react";

import { useMaybeAuth } from "@lib/auth/NukeAuthProvider";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { useSurveys } from "../hooks/useSurveyAdmin";

const ADMIN_ROLE = "survey-admin";

export function SurveyAdminDashboard() {
  const auth = useMaybeAuth();
  const token = auth?.token ?? null;
  const { data: surveys, error, isLoading } = useSurveys(token);

  const totalResponses = React.useMemo(
    () => surveys?.reduce((sum, survey) => sum + survey.count, 0) ?? 0,
    [surveys],
  );
  const latestResponse = React.useMemo(() => {
    if (!surveys || surveys.length === 0) return null;
    return surveys
      .filter((survey) => survey.latestAt)
      .sort(
        (a, b) =>
          new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
      )[0]?.latestAt;
  }, [surveys]);

  if (!auth || auth.isLoading) {
    return <DashboardSkeleton />;
  }

  if (!auth.isAuthenticated) {
    return (
      <Card variant="bubble" className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ClipboardList className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Admin sign-in required
        </h2>
        <p className="mt-2 text-muted-foreground">
          Sign in to view and manage survey responses.
        </p>
        <Button onClick={auth.login} className="mt-6">
          Sign in
        </Button>
      </Card>
    );
  }

  if (!auth.hasRole(ADMIN_ROLE)) {
    return (
      <Card variant="bubble" className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ClipboardList className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Access denied
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your account does not have the survey admin role.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card variant="bubble" className="p-8 text-center text-destructive">
        <p>{error}</p>
      </Card>
    );
  }

  if (!surveys || surveys.length === 0) {
    return (
      <Card variant="bubble" className="p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Inbox className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No responses yet
        </h2>
        <p className="mt-2 text-muted-foreground">
          Responses will appear here once surveys are submitted.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<ClipboardList size={20} />}
          label="Active surveys"
          value={surveys.length}
        />
        <SummaryCard
          icon={<BarChart3 size={20} />}
          label="Total responses"
          value={totalResponses}
        />
        <SummaryCard
          icon={<Clock size={20} />}
          label="Latest response"
          value={
            latestResponse ? new Date(latestResponse).toLocaleDateString() : "—"
          }
          subvalue={
            latestResponse
              ? new Date(latestResponse).toLocaleTimeString()
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => (
          <Card
            key={survey.slug}
            variant="bubble"
            className="flex flex-col p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardList size={20} />
              </div>
              {survey.latestAt && (
                <span className="text-xs text-muted-foreground">
                  Latest {formatRelativeTime(survey.latestAt)}
                </span>
              )}
            </div>

            <div className="mt-4">
              <h3 className="line-clamp-1 font-semibold text-foreground">
                {survey.title}
              </h3>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {survey.count.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  response{survey.count === 1 ? "" : "s"}
                </span>
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-border/50 pt-4">
              <a
                href={`/admin/surveys/${survey.slug}`}
                className="group inline-flex flex-1 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View responses
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subvalue?: string;
}) {
  return (
    <Card variant="bubble" className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
        {subvalue && (
          <p className="text-xs text-muted-foreground">{subvalue}</p>
        )}
      </div>
    </Card>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} variant="bubble" className="h-20 animate-pulse p-4">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="mt-3 h-5 w-1/4 rounded bg-muted" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} variant="bubble" className="h-48 animate-pulse p-5">
            <div className="h-10 w-10 rounded-xl bg-muted" />
            <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-3 h-8 w-1/3 rounded bg-muted" />
            <div className="mt-5 h-px w-full bg-muted" />
            <div className="mt-4 h-4 w-1/3 rounded bg-muted" />
          </Card>
        ))}
      </div>
    </div>
  );
}
