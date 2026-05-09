export type AuthPersistence = "local" | "session";

export interface StoredAuthState {
  token: string | null;
  persistence: AuthPersistence | null;
}

export interface AuthSyncPayload {
  action: "token-set" | "token-cleared";
  persistence: AuthPersistence;
  tokenFingerprint?: string;
  ts: number;
  nonce: number;
}

const LOCAL_TOKEN_KEY = "auth:token:local";
const SESSION_TOKEN_KEY = "auth:token:session";
const SUPPRESS_LOCAL_FALLBACK_KEY = "auth:suppress-local-fallback";
const AUTH_SYNC_KEY = "auth:sync";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function hashToken(token: string): string {
  let hash = 5381;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 33) ^ token.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function getLocalToken(): string | null {
  return window.localStorage.getItem(LOCAL_TOKEN_KEY);
}

function getSessionToken(): string | null {
  return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
}

function setLocalFallbackSuppressed(suppressed: boolean): void {
  if (suppressed) {
    window.sessionStorage.setItem(SUPPRESS_LOCAL_FALLBACK_KEY, "1");
    return;
  }

  window.sessionStorage.removeItem(SUPPRESS_LOCAL_FALLBACK_KEY);
}

function isLocalFallbackSuppressed(): boolean {
  return window.sessionStorage.getItem(SUPPRESS_LOCAL_FALLBACK_KEY) === "1";
}

function notifyAuthStateChanged(payload: AuthSyncPayload): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_SYNC_KEY, JSON.stringify(payload));
}

function clearTokenForPersistence(persistence: AuthPersistence): void {
  if (persistence === "local") {
    window.localStorage.removeItem(LOCAL_TOKEN_KEY);
    return;
  }

  window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

export function resolveAuthPersistence(remember?: boolean): AuthPersistence {
  return remember === false ? "session" : "local";
}

export function getStoredAuthState(): StoredAuthState {
  if (!isBrowser()) {
    return { token: null, persistence: null };
  }

  const sessionToken = getSessionToken();
  if (sessionToken) {
    return { token: sessionToken, persistence: "session" };
  }

  if (isLocalFallbackSuppressed()) {
    return { token: null, persistence: null };
  }

  const localToken = getLocalToken();
  return {
    token: localToken,
    persistence: localToken ? "local" : null,
  };
}

export function getStoredToken(): string | null {
  return getStoredAuthState().token;
}

export function setStoredToken(
  token: string,
  persistence: AuthPersistence = "local",
): void {
  if (!isBrowser()) {
    return;
  }

  if (persistence === "local") {
    window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
    clearTokenForPersistence("session");
    setLocalFallbackSuppressed(false);
    notifyAuthStateChanged({
      action: "token-set",
      persistence: "local",
      ts: Date.now(),
      nonce: Math.random(),
    });
    return;
  }

  window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  setLocalFallbackSuppressed(true);
}

export function clearStoredToken(options: { notify?: boolean } = {}): void {
  if (!isBrowser()) {
    return;
  }

  const { token, persistence } = getStoredAuthState();
  if (!token || !persistence) {
    clearTokenForPersistence("session");
    setLocalFallbackSuppressed(false);
    return;
  }

  clearTokenForPersistence(persistence);
  if (persistence === "local") {
    setLocalFallbackSuppressed(false);
  }

  if (options.notify !== false) {
    notifyAuthStateChanged({
      action: "token-cleared",
      persistence,
      tokenFingerprint: hashToken(token),
      ts: Date.now(),
      nonce: Math.random(),
    });
  }
}

export function parseAuthSyncEvent(event: StorageEvent): AuthSyncPayload | null {
  if (event.key !== AUTH_SYNC_KEY || !event.newValue) {
    return null;
  }

  try {
    const payload = JSON.parse(event.newValue) as Partial<AuthSyncPayload>;
    if (
      (payload.action === "token-set" || payload.action === "token-cleared") &&
      (payload.persistence === "local" || payload.persistence === "session")
    ) {
      return {
        action: payload.action,
        persistence: payload.persistence,
        tokenFingerprint: payload.tokenFingerprint,
        ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
        nonce: typeof payload.nonce === "number" ? payload.nonce : Math.random(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function applyRemoteTokenClear(payload: AuthSyncPayload): boolean {
  if (!isBrowser() || payload.action !== "token-cleared" || !payload.tokenFingerprint) {
    return false;
  }

  const tokenToCheck =
    payload.persistence === "local" ? getLocalToken() : getSessionToken();

  if (!tokenToCheck || hashToken(tokenToCheck) !== payload.tokenFingerprint) {
    return false;
  }

  clearTokenForPersistence(payload.persistence);
  return true;
}
