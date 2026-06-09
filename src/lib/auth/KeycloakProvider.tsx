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
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);

    const accountUrl = `${url}/realms/${realm}/account`;

    useEffect(() => {
        let mounted = true;

        const init = () => {
            if (!mounted) return;
            setIsLoading(true);

            // Cap Keycloak init so a slow/unreachable auth server doesn't
            // delay page interactivity or skew local Lighthouse scores.
            const KEYCLOAK_INIT_TIMEOUT = 5000;
            // Skip silent SSO iframe on localhost/127.0.0.1 because the auth
            // redirect target is the production domain and will fail/timeout.
            const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(
                window.location.hostname,
            );
            const initPromise = keycloak.init({
                onLoad: isLocalhost ? undefined : "check-sso",
                silentCheckSsoRedirectUri: isLocalhost
                    ? undefined
                    : window.location.origin + "/silent-check-sso.html",
                pkceMethod: "S256",
                enableLogging: process.env.NODE_ENV === "development",
            });
            const timeoutPromise = new Promise<boolean>((_, reject) => {
                const id = window.setTimeout(
                    () => reject(new Error("Keycloak init timeout")),
                    KEYCLOAK_INIT_TIMEOUT,
                );
                initPromise
                    .then(() => window.clearTimeout(id))
                    .catch(() => window.clearTimeout(id));
            });

            Promise.race([initPromise, timeoutPromise])
                .then((authenticated) => {
                    if (!mounted) return;

                    setIsAuthenticated(authenticated);
                    setUser(authenticated ? mapUser(keycloak) : null);
                    setIsLoading(false);
                })
                .catch((error) => {
                    if (!mounted) return;
                    console.error("Keycloak init failed:", error);
                    setIsAuthenticated(false);
                    setUser(null);
                    setIsLoading(false);
                });
        };

        // Defer Keycloak init until the page has finished initial render
        // to avoid blocking LCP on auth checks.
        if (document.readyState === "complete") {
            init();
        } else {
            window.addEventListener("load", init, { once: true });
        }

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
