import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
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

interface ControllerConfig {
  url: string;
  realm: string;
  clientId: string;
}

const controllers = new Map<string, AuthController>();

function getController(config: ControllerConfig): AuthController {
  const key = `${config.url}|${config.realm}|${config.clientId}`;
  let controller = controllers.get(key);
  if (!controller) {
    controller = new AuthController(config);
    controllers.set(key, controller);
  }
  return controller;
}

// Cap Keycloak init so a slow/unreachable auth server doesn't delay page
// interactivity or skew local Lighthouse scores.
function withInitTimeout(
  initPromise: Promise<boolean>,
  ms = 5000,
): Promise<boolean> {
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
}

class AuthController {
  private keycloak: Keycloak;
  private state: AuthContextValue;
  private listeners = new Set<() => void>();
  private initPromise: Promise<boolean> | null = null;
  private config: ControllerConfig;
  private lastRefreshRef = { current: 0 };
  private refreshTimerRef: number | null = null;
  private pendingLoginRef = { current: false };
  private readyRef = { current: false };
  private activityHandler: (() => void) | null = null;
  private boundStorageHandler: ((event: StorageEvent) => void) | null = null;

  constructor(config: ControllerConfig) {
    this.config = config;
    this.keycloak = new Keycloak({
      url: config.url,
      realm: config.realm,
      clientId: config.clientId,
    });
    this.state = {
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      hasRole: (role) => this.hasRole(role),
      login: () => this.login(),
      logout: () => this.logout(),
      accountUrl: `${config.url}/realms/${config.realm}/account`,
    };
    this.setupCallbacks();
    this.setupStorageSync();
  }

  destroy() {
    this.stopRefreshTimer();
    this.stopActivityListeners();
    this.teardownStorageSync();
    this.listeners.clear();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (!this.initPromise) {
      void this.init();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): AuthContextValue {
    return this.state;
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(partial: Partial<AuthContextValue>) {
    const wasAuthenticated = this.state.isAuthenticated;
    this.state = { ...this.state, ...partial };
    this.notify();

    if (this.state.isAuthenticated && !wasAuthenticated) {
      this.startRefreshTimer();
      this.startActivityListeners();
    } else if (!this.state.isAuthenticated && wasAuthenticated) {
      this.stopRefreshTimer();
      this.stopActivityListeners();
    }
  }

  private setupCallbacks() {
    this.keycloak.onAuthSuccess = () => {
      this.handleAuth(true);
    };

    this.keycloak.onAuthRefreshSuccess = () => {
      saveTokens(this.keycloak);
      this.lastRefreshRef.current = Date.now();
    };

    this.keycloak.onAuthRefreshError = () => {
      console.error("Keycloak refresh error");
      this.clearAuthState();
    };

    this.keycloak.onAuthLogout = () => {
      this.clearAuthState();
    };

    this.keycloak.onTokenExpired = () => {
      void this.refreshTokens();
    };
  }

  private clearAuthState() {
    this.setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
    });
    clearTokens();
    // Once we reach a terminal signed-out state the adapter is ready for
    // login() calls. This matters on localhost where we skip silent SSO and
    // go straight to signed-out after logout or when no tokens are stored.
    this.readyRef.current = true;
    this.flushPendingLogin();
  }

  private handleAuth(authenticated: boolean) {
    const isAuth = authenticated || this.keycloak.authenticated || false;
    this.setState({
      isAuthenticated: isAuth,
      isLoading: false,
      user: isAuth ? mapUser(this.keycloak) : null,
      token: this.keycloak.token || null,
    });
    this.readyRef.current = true;
    if (isAuth) {
      saveTokens(this.keycloak);
      this.lastRefreshRef.current = Date.now();
    }
    this.flushPendingLogin();
  }

  private flushPendingLogin() {
    if (this.pendingLoginRef.current) {
      this.pendingLoginRef.current = false;
      this.keycloak.login({
        redirectUri: window.location.origin + window.location.pathname,
      });
    }
  }

  private async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    if (!this.config.url || !this.config.realm || !this.config.clientId) {
      this.clearAuthState();
      return false;
    }

    const isLoginCallback = hasAuthResponseInUrl();

    // When the URL carries a fresh login callback (code/state), process it
    // directly. Using "check-sso" here can race with or skip callback
    // processing, leaving the UI showing the Sign In button until a refresh.
    if (isLoginCallback) {
      try {
        const authenticated = await withInitTimeout(
          this.keycloak.init({
            pkceMethod: "S256",
            checkLoginIframe: false,
            enableLogging: process.env.NODE_ENV === "development",
          }),
        );
        this.handleAuth(authenticated);
        return authenticated;
      } catch (error) {
        console.error("Keycloak init failed:", error);

        // The callback may have already been consumed by another island before
        // this one initialized, or the init timed out. If we have stored tokens,
        // try restoring them instead of leaving the user signed-out.
        if (loadTokens()) {
          return this.restoreTokensFromStorage();
        }

        this.handleAuth(false);
        return false;
      }
    }

    // No fresh callback: try restoring tokens from a previous login first.
    // This avoids relying on third-party cookies for the silent SSO check on
    // reload and works on localhost where the silent SSO iframe target differs
    // from the production redirect domain.
    if (loadTokens()) {
      return this.restoreTokensFromStorage();
    }

    // No stored tokens: initialize the adapter anyway so login() works, then
    // optionally run a silent SSO check. Skip the silent SSO iframe on
    // localhost/127.0.0.1 because the auth redirect target is the production
    // domain and will fail/timeout there.
    const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(
      window.location.hostname,
    );

    try {
      const authenticated = await withInitTimeout(
        this.keycloak.init({
          onLoad: isLocalhost ? undefined : "check-sso",
          silentCheckSsoRedirectUri: isLocalhost
            ? undefined
            : window.location.origin + "/silent-check-sso.html",
          pkceMethod: "S256",
          checkLoginIframe: false,
          enableLogging: process.env.NODE_ENV === "development",
        }),
      );
      this.handleAuth(authenticated);
      return authenticated;
    } catch (error) {
      console.error("Keycloak init failed:", error);
      this.handleAuth(false);
      return false;
    }
  }

  private async restoreTokensFromStorage(): Promise<boolean> {
    const tokens = loadTokens();
    if (!tokens) {
      this.clearAuthState();
      return false;
    }

    try {
      const authenticated = await withInitTimeout(
        this.keycloak.init({
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          timeSkew: tokens.timeSkew,
          pkceMethod: "S256",
          checkLoginIframe: false,
          enableLogging: process.env.NODE_ENV === "development",
        }),
      );
      if (authenticated) {
        this.handleAuth(true);
        return true;
      }

      // The stored access token may have expired while the refresh token
      // is still valid. Try a refresh before falling back to silent SSO,
      // which is more fragile in browsers with strict third-party cookie
      // policies.
      if (this.keycloak.refreshToken) {
        const refreshed = await this.refreshTokens(false);
        if (refreshed) {
          this.handleAuth(true);
          return true;
        }
      }

      clearTokens();
      this.clearAuthState();
      this.readyRef.current = true;
      return false;
    } catch (error) {
      console.error("Keycloak token restore failed:", error);
      clearTokens();
      this.clearAuthState();
      this.readyRef.current = true;
      return false;
    }
  }

  private async refreshTokens(retry = true): Promise<boolean> {
    // Only check for a refresh token. During init the access token may be
    // expired and keycloak.authenticated false, but the refresh token can
    // still recover the session.
    if (!this.keycloak.refreshToken) return false;

    try {
      const refreshed = await this.keycloak.updateToken(
        REFRESH_MIN_VALIDITY_SECONDS,
      );
      if (refreshed) {
        saveTokens(this.keycloak);
        this.lastRefreshRef.current = Date.now();
      }
      return true;
    } catch (error) {
      console.error("Keycloak token refresh failed:", error);
      if (retry) {
        // One retry after a short delay; transient network errors or a
        // briefly overloaded Keycloak server can recover.
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        return this.refreshTokens(false);
      }
      this.clearAuthState();
      return false;
    }
  }

  private startRefreshTimer() {
    this.stopRefreshTimer();
    this.refreshTimerRef = window.setInterval(() => {
      void this.refreshTokens();
    }, REFRESH_INTERVAL_MS);
  }

  private stopRefreshTimer() {
    if (this.refreshTimerRef) {
      window.clearInterval(this.refreshTimerRef);
      this.refreshTimerRef = null;
    }
  }

  private startActivityListeners() {
    this.stopActivityListeners();

    const ACTIVITY_DEBOUNCE_MS = 30_000;

    this.activityHandler = () => {
      const tokenExp = this.keycloak.tokenParsed
        ? (this.keycloak.tokenParsed as Record<string, unknown>).exp
        : undefined;
      if (typeof tokenExp !== "number") return;

      const expiresInSeconds = tokenExp - Math.ceil(Date.now() / 1000);
      const recentlyRefreshed =
        Date.now() - this.lastRefreshRef.current < ACTIVITY_DEBOUNCE_MS;

      if (
        expiresInSeconds < REFRESH_MIN_VALIDITY_SECONDS &&
        !recentlyRefreshed
      ) {
        void this.refreshTokens();
      }
    };

    window.addEventListener("pointerdown", this.activityHandler, {
      passive: true,
    });
    window.addEventListener("keydown", this.activityHandler, {
      passive: true,
    });
  }

  private stopActivityListeners() {
    if (this.activityHandler) {
      window.removeEventListener("pointerdown", this.activityHandler);
      window.removeEventListener("keydown", this.activityHandler);
      this.activityHandler = null;
    }
  }

  private setupStorageSync() {
    this.boundStorageHandler = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;

      if (!event.newValue) {
        // Tokens were removed in another tab (logout).
        if (this.state.isAuthenticated) {
          this.clearAuthState();
        }
        return;
      }

      // Tokens were added/updated in another tab (login). If this controller
      // is not authenticated, restore the session without a page reload.
      if (!this.state.isAuthenticated) {
        void this.restoreTokensFromStorage();
      }
    };

    window.addEventListener("storage", this.boundStorageHandler);
  }

  private teardownStorageSync() {
    if (this.boundStorageHandler) {
      window.removeEventListener("storage", this.boundStorageHandler);
      this.boundStorageHandler = null;
    }
  }

  private login() {
    if (!this.config.url || !this.config.realm || !this.config.clientId) {
      console.error(
        "NukeAuth login failed: auth configuration is missing. " +
          "Check PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, and PUBLIC_AUTH_CLIENT_ID.",
      );
      return;
    }
    if (!this.readyRef.current) {
      // User clicked Sign In before the silent init finished. Queue the login
      // so it runs as soon as Keycloak is ready; calling keycloak.login() too
      // early crashes because the adapter has not been initialized yet.
      this.pendingLoginRef.current = true;
      return;
    }
    this.keycloak.login({
      redirectUri: window.location.origin + window.location.pathname,
    });
  }

  private logout() {
    this.clearAuthState();
    if (this.config.url && this.config.realm) {
      this.keycloak.logout({ redirectUri: window.location.origin });
    }
  }

  private hasRole(role: string): boolean {
    if (!this.keycloak.tokenParsed) return false;
    const roles = extractRoles(
      this.keycloak.tokenParsed as Record<string, unknown>,
    );
    return roles.includes(role);
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

  const controller = configValid
    ? getController({ url, realm, clientId })
    : null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!controller) return () => {};
      return controller.subscribe(onStoreChange);
    },
    [controller],
  );

  const state = useSyncExternalStore(
    subscribe,
    () => (controller ? controller.getState() : defaultState),
    () => (controller ? controller.getState() : defaultState),
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

const defaultState: AuthContextValue = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  token: null,
  hasRole: () => false,
  login: () => {
    console.error(
      "NukeAuth login failed: auth configuration is missing. " +
        "Check PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, and PUBLIC_AUTH_CLIENT_ID.",
    );
  },
  logout: () => {},
  accountUrl: "",
};

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

// HMR safety: when this module is replaced during development, clean up the
// old controller so stale Keycloak instances and timers don't accumulate.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const [, controller] of controllers) {
      controller.destroy();
    }
    controllers.clear();
  });
}
