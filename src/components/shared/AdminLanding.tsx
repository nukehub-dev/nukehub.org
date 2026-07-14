import * as React from "react";
import {
  ArrowRight,
  ClipboardList,
  Lock,
  Mail,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { NukeAuthProvider, useAuth } from "@lib/auth/NukeAuthProvider";
import {
  hasAnyRole,
  NEWSLETTER_ACCESS_ROLES,
  NEWSLETTER_ADMIN_ROLE,
  SURVEY_ACCESS_ROLES,
  SURVEY_ADMIN_ROLE,
} from "@lib/auth/roles";

interface AdminLandingPageProps {
  url: string;
  realm: string;
  clientId: string;
}

export function AdminLandingPage({
  url,
  realm,
  clientId,
}: AdminLandingPageProps) {
  return (
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <AdminLanding />
    </NukeAuthProvider>
  );
}

function AdminLanding() {
  const { isAuthenticated, isLoading, user, hasRole, login } = useAuth();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} variant="bubble" className="h-28 animate-pulse p-5">
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="mt-3 h-3 w-3/4 rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card variant="bubble" className="p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Sign in required
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          You need a NukeHub staff account to access administration.
        </p>
        <Button onClick={login} className="mt-6">
          Sign in
        </Button>
      </Card>
    );
  }

  const canSurveys = hasAnyRole(hasRole, SURVEY_ACCESS_ROLES);
  const canNewsletter = hasAnyRole(hasRole, NEWSLETTER_ACCESS_ROLES);

  if (!canSurveys && !canNewsletter) {
    return (
      <Card variant="bubble" className="p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          No admin access
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          {user?.email
            ? `${user.email} does not have`
            : "Your account does not have"}{" "}
          any administration roles. Ask an administrator to grant survey or
          newsletter roles in NukeAuth.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {canSurveys && (
        <AdminCard
          href="/admin/surveys/"
          icon={ClipboardList}
          title="Surveys"
          description="Submissions, aggregate stats, and CSV exports."
          roleLabel={hasRole(SURVEY_ADMIN_ROLE) ? "Admin" : "Viewer"}
        />
      )}
      {canNewsletter && (
        <AdminCard
          href="/admin/newsletter/"
          icon={Mail}
          title="Newsletter"
          description="Subscribers, campaigns, and delivery stats."
          roleLabel={hasRole(NEWSLETTER_ADMIN_ROLE) ? "Admin" : "Staff"}
        />
      )}
    </div>
  );
}

interface AdminCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  roleLabel: string;
}

function AdminCard({
  href,
  icon: Icon,
  title,
  description,
  roleLabel,
}: AdminCardProps) {
  return (
    <a href={href} className="group block">
      <Card
        variant="bubble"
        className="flex h-full items-start gap-4 p-5 transition-colors group-hover:border-primary/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <Badge variant="secondary">{roleLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Card>
    </a>
  );
}
