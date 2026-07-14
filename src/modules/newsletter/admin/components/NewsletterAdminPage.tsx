import { NukeAuthProvider } from "@lib/auth/NukeAuthProvider";
import { NewsletterAdminDashboard } from "./NewsletterAdminDashboard";

interface NewsletterAdminPageProps {
  url: string;
  realm: string;
  clientId: string;
}

export function NewsletterAdminPage({
  url,
  realm,
  clientId,
}: NewsletterAdminPageProps) {
  return (
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <NewsletterAdminDashboard />
    </NukeAuthProvider>
  );
}
