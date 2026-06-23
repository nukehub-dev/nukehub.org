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

const TOKEN_KEY = "nukehub_keycloak_tokens";

function hasAuthResponseInUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("code") ||
    params.has("state") ||
    params.has("session_state") ||
    params.has("error") ||
    params.has("id_token") ||
    params.has("access_token")
  );
}

interface StoredTokens {
  token: string;
  refreshToken: string;
  idToken?: string;
  timeSkew?: number;
}

function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed.token || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveTokens(keycloak: Keycloak) {
  try {
    const tokens: StoredTokens = {
      token: keycloak.token || "",
      refreshToken: keycloak.refreshToken || "",
      idToken: keycloak.idToken,
      timeSkew: keycloak.timeSkew,
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    // ignore storage errors
  }
}

function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
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

    const handleAuth = (authenticated: boolean) => {
      if (!mounted) return;
      setIsAuthenticated(authenticated);
      setUser(authenticated ? mapUser(keycloak) : null);
      setIsLoading(false);
      if (authenticated) {
        saveTokens(keycloak);
      }
    };

    const initWithCheckSso = () => {
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
        .then((authenticated) => handleAuth(authenticated))
        .catch((error) => {
          if (!mounted) return;
          console.error("Keycloak init failed:", error);
          handleAuth(false);
        });
    };

    const initWithStoredTokens = () => {
      // If the URL carries a fresh auth response (e.g. after login redirect),
      // let Keycloak parse it instead of restoring stale stored tokens.
      if (hasAuthResponseInUrl()) {
        initWithCheckSso();
        return;
      }

      const tokens = loadTokens();
      if (!tokens) {
        initWithCheckSso();
        return;
      }

      if (!mounted) return;
      setIsLoading(true);

      keycloak
        .init({
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          timeSkew: tokens.timeSkew,
          pkceMethod: "S256",
          checkLoginIframe: false,
          enableLogging: process.env.NODE_ENV === "development",
        })
        .then((authenticated) => {
          if (authenticated) {
            handleAuth(true);
          } else {
            clearTokens();
            initWithCheckSso();
          }
        })
        .catch((error) => {
          console.error("Keycloak token restore failed:", error);
          clearTokens();
          initWithCheckSso();
        });
    };

    const init = () => {
      // Try restoring tokens from a previous login first. This avoids
      // relying on third-party cookies for the silent SSO check on reload.
      initWithStoredTokens();
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
      saveTokens(keycloak);
    };

    keycloak.onAuthRefreshSuccess = () => {
      saveTokens(keycloak);
    };

    keycloak.onAuthLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
      clearTokens();
    };

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        setIsAuthenticated(false);
        setUser(null);
        clearTokens();
      });
    };

    return () => {
      mounted = false;
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, [keycloak]);

  const login = useCallback(() => {
    keycloak.login({ redirectUri: window.location.href });
  }, [keycloak]);

  const logout = useCallback(() => {
    clearTokens();
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
  const username = String(profile.preferred_username || profile.username || "");

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
