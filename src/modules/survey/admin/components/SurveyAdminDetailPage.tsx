import { NukeAuthProvider } from "@lib/auth/NukeAuthProvider";
import type { Survey } from "../../types";
import { SurveyDetailDashboard } from "./SurveyDetailDashboard";

interface SurveyAdminDetailPageProps {
  url: string;
  realm: string;
  clientId: string;
  slug: string;
  title: string;
  survey?: Survey;
}

export function SurveyAdminDetailPage({
  url,
  realm,
  clientId,
  slug,
  title,
  survey,
}: SurveyAdminDetailPageProps) {
  return (
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <SurveyDetailDashboard slug={slug} title={title} survey={survey} />
    </NukeAuthProvider>
  );
}
