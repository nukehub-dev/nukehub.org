import * as React from "react";
import { ArrowRight } from "lucide-react";
import { NukeAuthProvider, useMaybeAuth } from "@lib/auth/NukeAuthProvider";

interface AdminSurveyLinkProps {
  url: string;
  realm: string;
  clientId: string;
}

export function AdminSurveyLink({
  url,
  realm,
  clientId,
}: AdminSurveyLinkProps) {
  return (
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <AdminSurveyLinkInner />
    </NukeAuthProvider>
  );
}

const ADMIN_ROLE = "survey-admin";
const VIEWER_ROLE = "survey-viewer";

function AdminSurveyLinkInner() {
  const auth = useMaybeAuth();
  const canAccess = auth?.hasRole(ADMIN_ROLE) || auth?.hasRole(VIEWER_ROLE);
  if (!auth || auth.isLoading || !auth.isAuthenticated || !canAccess) {
    return null;
  }

  return (
    <a
      href="/admin/surveys"
      className="group inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
    >
      View responses
      <ArrowRight
        size={14}
        className="transition-transform group-hover:translate-x-0.5"
      />
    </a>
  );
}
