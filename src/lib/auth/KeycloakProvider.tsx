import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import Keycloak from "keycloak-js";

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatarUrl?: string;
}

interface AuthContextValue {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    login: () => void;
    logout: () => void;
    accountUrl: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface KeycloakProviderProps {
    children: ReactNode;
    url: string;
    realm: string;
    clientId: string;
}

export function KeycloakProvider({
    children,
    url,
    realm,
    clientId,
}: KeycloakProviderProps) {
    const [keycloak] = useState(() => new Keycloak({ url, realm, clientId }));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);

    const accountUrl = `${url}/realms/${realm}/account`;

    useEffect(() => {
        let mounted = true;

        keycloak
            .init({
                onLoad: "check-sso",
                silentCheckSsoRedirectUri:
                    window.location.origin + "/silent-check-sso.html",
                pkceMethod: "S256",
                enableLogging: process.env.NODE_ENV === "development",
            })
            .then((authenticated) => {
                if (!mounted) return;

                setIsAuthenticated(authenticated);
                setUser(authenticated ? mapUser(keycloak) : null);
                setIsLoading(false);
            })
            .catch((error) => {
                if (!mounted) return;
                console.error("Keycloak init failed:", error);
                setIsLoading(false);
            });

        keycloak.onAuthSuccess = () => {
            setIsAuthenticated(true);
            setUser(mapUser(keycloak));
        };

        keycloak.onAuthLogout = () => {
            setIsAuthenticated(false);
            setUser(null);
        };

        keycloak.onTokenExpired = () => {
            keycloak.updateToken(30).catch(() => {
                setIsAuthenticated(false);
                setUser(null);
            });
        };

        return () => {
            mounted = false;
            keycloak.onAuthSuccess = undefined;
            keycloak.onAuthLogout = undefined;
            keycloak.onTokenExpired = undefined;
        };
    }, [keycloak]);

    const login = useCallback(() => {
        keycloak.login({ redirectUri: window.location.href });
    }, [keycloak]);

    const logout = useCallback(() => {
        keycloak.logout({ redirectUri: window.location.origin });
    }, [keycloak]);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
                user,
                login,
                logout,
                accountUrl,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

function mapUser(keycloak: Keycloak): AuthUser | null {
    const profile = keycloak.tokenParsed as Record<string, unknown> | undefined;
    if (!profile) return null;

    const firstName = String(profile.given_name || profile.firstName || "");
    const lastName = String(profile.family_name || profile.lastName || "");
    const username = String(
        profile.preferred_username || profile.username || "",
    );

    return {
        id: String(profile.sub || ""),
        email: String(profile.email || ""),
        username,
        firstName,
        lastName,
        fullName: [firstName, lastName].filter(Boolean).join(" ") || username,
    };
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within a KeycloakProvider");
    }
    return ctx;
}

export function useMaybeAuth(): AuthContextValue | undefined {
    return useContext(AuthContext);
}
