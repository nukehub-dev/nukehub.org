import * as React from "react";
import { ClipboardList, ExternalLink, BarChart3 } from "lucide-react";
import { useMaybeAuth } from "@lib/auth/NukeAuthProvider";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { useSurveys } from "../hooks/useSurveyAdmin";

export function SurveyAdminDashboard() {
  const auth = useMaybeAuth();
  const token = auth?.token ?? null;
  const { data: surveys, error, isLoading } = useSurveys(token);

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
      <Card variant="bubble" className="p-8 text-center">
        <p className="text-muted-foreground">No survey responses yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => (
          <Card
            key={survey.slug}
            variant="bubble"
            className="flex flex-col p-5 transition-all hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground">
                  {survey.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {survey.count} response{survey.count === 1 ? "" : "s"}
                </p>
                {survey.latestAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Latest: {new Date(survey.latestAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 size={20} />
              </div>
            </div>
            <a
              href={`/admin/surveys/${survey.slug}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View responses
              <ExternalLink size={14} />
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} variant="bubble" className="h-32 animate-pulse p-5">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
          <div className="mt-4 h-3 w-1/3 rounded bg-muted" />
        </Card>
      ))}
    </div>
  );
}
