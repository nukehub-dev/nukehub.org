"use client";

import { KeycloakProvider } from "@lib/auth/KeycloakProvider";
import { Header } from "./Header";
import type { ProjectNavEntry } from "@data/nav.tsx";

interface AuthHeaderProps {
  url: string;
  realm: string;
  clientId: string;
  projectEntries?: ProjectNavEntry[];
}

export function AuthHeader({
  url,
  realm,
  clientId,
  projectEntries,
}: AuthHeaderProps) {
  return (
    <KeycloakProvider url={url} realm={realm} clientId={clientId}>
      <Header projectEntries={projectEntries} />
    </KeycloakProvider>
  );
}
