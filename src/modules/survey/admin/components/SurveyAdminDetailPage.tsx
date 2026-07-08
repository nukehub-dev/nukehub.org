import { NukeAuthProvider } from "@lib/auth/NukeAuthProvider";
import { SurveyDetailDashboard } from "./SurveyDetailDashboard";

interface SurveyAdminDetailPageProps {
  url: string;
  realm: string;
  clientId: string;
  slug: string;
  title: string;
}

export function SurveyAdminDetailPage({
  url,
  realm,
  clientId,
  slug,
  title,
}: SurveyAdminDetailPageProps) {
  return (
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <SurveyDetailDashboard slug={slug} title={title} />
    </NukeAuthProvider>
  );
}
