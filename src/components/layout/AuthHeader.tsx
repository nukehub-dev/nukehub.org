"use client";

import { NukeAuthProvider } from "@lib/auth/NukeAuthProvider";
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
    <NukeAuthProvider url={url} realm={realm} clientId={clientId}>
      <Header projectEntries={projectEntries} />
    </NukeAuthProvider>
  );
}
