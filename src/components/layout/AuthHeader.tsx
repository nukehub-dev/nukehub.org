"use client";

import { KeycloakProvider } from "@lib/auth/KeycloakProvider";
import { Header } from "./Header";

interface AuthHeaderProps {
    url: string;
    realm: string;
    clientId: string;
}

export function AuthHeader({ url, realm, clientId }: AuthHeaderProps) {
    return (
        <KeycloakProvider url={url} realm={realm} clientId={clientId}>
            <Header />
        </KeycloakProvider>
    );
}
