import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
  token: string | null;
  hasRole: (role: string) => boolean;
  login: () => void;
  logout: () => void;
  accountUrl: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface NukeAuthProviderProps {
  children: ReactNode;
  url: string;
  realm: string;
  clientId: string;
}

const TOKEN_KEY = "nukehub_auth_tokens";

// Refresh the access token before it expires. With a 5-minute Keycloak
// access-token lifespan, refreshing every 60 seconds with a 70-second
// minimum validity gives several retry windows before expiry.
const REFRESH_INTERVAL_MS = 60_000;
const REFRESH_MIN_VALIDITY_SECONDS = 70;

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
      timeSkew: keycloak.timeSkew ?? undefined,
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

export function NukeAuthProvider({
  children,
  url,
  realm,
  clientId,
}: NukeAuthProviderProps) {
  const configValid = Boolean(url && realm && clientId);
  if (!configValid && process.env.NODE_ENV === "development") {
    console.error(
      "NukeAuthProvider: missing auth configuration. " +
        "Ensure PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, and PUBLIC_AUTH_CLIENT_ID are set.",
    );
  }

  const [keycloak] = useState(
    () =>
      new Keycloak({
        url: url || "",
        realm: realm || "",
        clientId: clientId || "",
      }),
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start in loading state so the sign-in button is not clickable until
  // Keycloak init has run. Calling keycloak.login() before init() completes
  // crashes because keycloak-js initializes its internal adapter in init().
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Track the last time we successfully refreshed so user-activity refreshes
  // do not hammer the Keycloak server.
  const lastRefreshRef = useRef<number>(0);
  const refreshTimerRef = useRef<number | null>(null);
  // Guard against concurrent init attempts from the mount effect and
  // cross-tab storage sync.
  const initInFlightRef = useRef<boolean>(false);
  // True once the first init attempt has finished (success or failure).
  // keycloak.login() crashes if called before init completes, so we queue
  // early clicks and run them as soon as init is done.
  const readyRef = useRef<boolean>(false);
  const pendingLoginRef = useRef<boolean>(false);

  const accountUrl = configValid ? `${url}/realms/${realm}/account` : "";

  const clearAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
    clearTokens();
  }, []);

  const setReady = useCallback(() => {
    readyRef.current = true;
  }, []);

  const flushPendingLogin = useCallback(() => {
    if (pendingLoginRef.current) {
      pendingLoginRef.current = false;
      keycloak.login({ redirectUri: window.location.href });
    }
  }, [keycloak]);

  const handleAuth = useCallback(
    (authenticated: boolean) => {
      setIsAuthenticated(authenticated);
      setUser(authenticated ? mapUser(keycloak) : null);
      setIsLoading(false);
      if (authenticated) {
        saveTokens(keycloak);
        lastRefreshRef.current = Date.now();
      }
      setReady();
      flushPendingLogin();
    },
    [keycloak, setReady, flushPendingLogin],
  );

  const refreshTokens = useCallback(
    async (retry = true): Promise<boolean> => {
      // Only check for a refresh token. During init the access token may be
      // expired and keycloak.authenticated false, but the refresh token can
      // still recover the session.
      if (!keycloak.refreshToken) return false;

      try {
        const refreshed = await keycloak.updateToken(
          REFRESH_MIN_VALIDITY_SECONDS,
        );
        if (refreshed) {
          saveTokens(keycloak);
          lastRefreshRef.current = Date.now();
        }
        return true;
      } catch (error) {
        console.error("Keycloak token refresh failed:", error);
        if (retry) {
          // One retry after a short delay; transient network errors or a
          // briefly overloaded Keycloak server can recover.
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
          return refreshTokens(false);
        }
        clearAuthState();
        return false;
      }
    },
    [keycloak, clearAuthState],
  );

  // Cap Keycloak init so a slow/unreachable auth server doesn't delay page
  // interactivity or skew local Lighthouse scores.
  const withInitTimeout = useCallback(
    (initPromise: Promise<boolean>, ms = 5000): Promise<boolean> => {
      let timeoutId = 0;
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error("Keycloak init timeout")),
          ms,
        );
      });
      initPromise
        .then(() => window.clearTimeout(timeoutId))
        .catch(() => window.clearTimeout(timeoutId));
      return Promise.race([initPromise, timeoutPromise]);
    },
    [],
  );

  const initWithCheckSso = useCallback(() => {
    if (!configValid) {
      clearAuthState();
      return;
    }

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

    withInitTimeout(initPromise)
      .then((authenticated) => {
        handleAuth(authenticated);
      })
      .catch((error) => {
        console.error("Keycloak init failed:", error);
        handleAuth(false);
      });
  }, [keycloak, handleAuth, clearAuthState, configValid, withInitTimeout]);

  const restoreTokensFromStorage = useCallback(() => {
    if (initInFlightRef.current) return;

    const tokens = loadTokens();
    if (!tokens) {
      // Anonymous visitor: no need to talk to Keycloak at all.
      clearAuthState();
      return;
    }

    if (!configValid) {
      clearTokens();
      clearAuthState();
      return;
    }

    initInFlightRef.current = true;

    const initPromise = keycloak.init({
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      timeSkew: tokens.timeSkew,
      pkceMethod: "S256",
      checkLoginIframe: false,
      enableLogging: process.env.NODE_ENV === "development",
    });

    withInitTimeout(initPromise)
      .then(async (authenticated) => {
        if (authenticated) {
          handleAuth(true);
          return;
        }

        // The stored access token may have expired while the refresh token
        // is still valid. Try a refresh before falling back to silent SSO,
        // which is more fragile in browsers with strict third-party cookie
        // policies.
        if (keycloak.refreshToken) {
          const refreshed = await refreshTokens(false);
          if (refreshed) {
            handleAuth(true);
            return;
          }
        }

        clearTokens();
        clearAuthState();
        setReady();
      })
      .catch((error) => {
        console.error("Keycloak token restore failed:", error);
        clearTokens();
        clearAuthState();
        setReady();
      })
      .finally(() => {
        initInFlightRef.current = false;
      });
  }, [
    keycloak,
    handleAuth,
    clearAuthState,
    refreshTokens,
    configValid,
    withInitTimeout,
    setReady,
  ]);

  // Initial mount: restore tokens or run silent SSO.
  useEffect(() => {
    keycloak.onAuthSuccess = () => {
      setIsAuthenticated(true);
      setUser(mapUser(keycloak));
      saveTokens(keycloak);
      lastRefreshRef.current = Date.now();
    };

    keycloak.onAuthRefreshSuccess = () => {
      saveTokens(keycloak);
      lastRefreshRef.current = Date.now();
    };

    keycloak.onAuthRefreshError = () => {
      console.error("Keycloak refresh error");
      clearAuthState();
    };

    keycloak.onAuthLogout = () => {
      clearAuthState();
    };

    keycloak.onTokenExpired = () => {
      refreshTokens();
    };

    const init = () => {
      // If the URL carries a fresh auth response (e.g. after login redirect),
      // or the user is anonymous (no stored tokens), run the standard
      // Keycloak init. This initializes the adapter so login() works and
      // checks for an existing SSO session when appropriate.
      if (hasAuthResponseInUrl() || !loadTokens()) {
        initWithCheckSso();
        return;
      }

      // Try restoring tokens from a previous login first. This avoids
      // relying on third-party cookies for the silent SSO check on reload.
      restoreTokensFromStorage();
    };

    // Run init immediately. Keycloak's init is async and non-blocking; waiting
    // for window.load risks missing the event if the island hydrates late.
    init();

    return () => {
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onAuthRefreshError = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, [
    keycloak,
    clearAuthState,
    refreshTokens,
    initWithCheckSso,
    restoreTokensFromStorage,
  ]);

  // Cross-tab sync: when another tab logs in or out, follow its state.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;

      if (!event.newValue) {
        // Tokens were removed in another tab (logout).
        if (isAuthenticated) {
          clearAuthState();
        }
        return;
      }

      // Tokens were added/updated in another tab (login). If this tab is not
      // authenticated, restore the session without a page reload.
      if (!isAuthenticated) {
        restoreTokensFromStorage();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isAuthenticated, clearAuthState, restoreTokensFromStorage]);

  // Periodic proactive refresh: keeps the access token from expiring even
  // when onTokenExpired events are throttled or missed (e.g., background tabs).
  useEffect(() => {
    if (!isAuthenticated) return;

    refreshTimerRef.current = window.setInterval(() => {
      refreshTokens();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, refreshTokens]);

  // Refresh on user activity when the token is near expiry, but rate-limit
  // so frequent clicks don't flood the Keycloak server.
  useEffect(() => {
    if (!isAuthenticated) return;

    const ACTIVITY_DEBOUNCE_MS = 30_000;

    const handleActivity = () => {
      const tokenExp = keycloak.tokenParsed
        ? (keycloak.tokenParsed as Record<string, unknown>).exp
        : undefined;
      if (typeof tokenExp !== "number") return;

      const expiresInSeconds = tokenExp - Math.ceil(Date.now() / 1000);
      const recentlyRefreshed =
        Date.now() - lastRefreshRef.current < ACTIVITY_DEBOUNCE_MS;

      if (
        expiresInSeconds < REFRESH_MIN_VALIDITY_SECONDS &&
        !recentlyRefreshed
      ) {
        refreshTokens();
      }
    };

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [isAuthenticated, keycloak, refreshTokens]);

  const login = useCallback(() => {
    if (!configValid) {
      console.error(
        "NukeAuth login failed: auth configuration is missing. " +
          "Check PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, and PUBLIC_AUTH_CLIENT_ID.",
      );
      return;
    }
    if (!readyRef.current) {
      // User clicked Sign In before the silent init finished. Queue the login
      // so it runs as soon as Keycloak is ready; calling keycloak.login() too
      // early crashes because the adapter has not been initialized yet.
      pendingLoginRef.current = true;
      return;
    }
    keycloak.login({ redirectUri: window.location.href });
  }, [configValid, keycloak]);

  const logout = useCallback(() => {
    clearAuthState();
    if (configValid) {
      keycloak.logout({ redirectUri: window.location.origin });
    }
  }, [keycloak, clearAuthState, configValid]);

  const hasRole = useCallback(
    (role: string) => {
      if (!keycloak.tokenParsed) return false;
      const roles = extractRoles(
        keycloak.tokenParsed as Record<string, unknown>,
      );
      return roles.includes(role);
    },
    [keycloak],
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token: keycloak.token || null,
        hasRole,
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

function extractRoles(tokenParsed: Record<string, unknown>): string[] {
  const roles: string[] = [];

  const realmAccess = tokenParsed.realm_access as
    | Record<string, unknown>
    | undefined;
  if (realmAccess && Array.isArray(realmAccess.roles)) {
    for (const role of realmAccess.roles) {
      if (typeof role === "string") roles.push(role);
    }
  }

  const resourceAccess = tokenParsed.resource_access as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (resourceAccess) {
    for (const client of Object.values(resourceAccess)) {
      if (client && Array.isArray(client.roles)) {
        for (const role of client.roles) {
          if (typeof role === "string") roles.push(role);
        }
      }
    }
  }

  return roles;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within a NukeAuthProvider");
  }
  return ctx;
}

export function useMaybeAuth(): AuthContextValue | undefined {
  return useContext(AuthContext);
}
