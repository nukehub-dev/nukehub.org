import { NukeAuthProvider } from "@lib/auth/NukeAuthProvider";
import { SurveyAdminDashboard } from "./SurveyAdminDashboard";

interface SurveyAdminPageProps {
  url: string;
  realm: string;
  clientId: string;
}

export function SurveyAdminPage({
  url,
  realm,
  clientId,
}: SurveyAdminPageProps) {
  return (
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <SurveyAdminDashboard />
    </NukeAuthProvider>
  );
}
