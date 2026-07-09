import * as React from "react";
import { BarChart3 } from "lucide-react";
import { NukeAuthProvider, useMaybeAuth } from "@lib/auth/NukeAuthProvider";
import { Button } from "@components/ui/Button";

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

function AdminSurveyLinkInner() {
  const auth = useMaybeAuth();
  if (!auth || auth.isLoading || !auth.isAuthenticated) {
    return null;
  }

  return (
    <a href="/admin/surveys">
      <Button variant="outline" size="sm">
        <BarChart3 size={16} />
        Admin
      </Button>
    </a>
  );
}
