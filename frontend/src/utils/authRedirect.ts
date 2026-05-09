const LOGIN_PATH = "/login";
const DEFAULT_AUTH_REDIRECT = "/dashboard";

interface AuthRouteState {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
}

function sanitizeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  if (path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}?`) || path.startsWith(`${LOGIN_PATH}#`)) {
    return null;
  }

  return path;
}

export function getRedirectPathFromState(state: unknown): string | null {
  const routeState = state as AuthRouteState | null;
  const from = routeState?.from;
  if (!from?.pathname) {
    return null;
  }

  return sanitizeRedirectPath(
    `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`,
  );
}

export function getRedirectPathFromSearch(search: string): string | null {
  const redirect = new URLSearchParams(search).get("redirect");
  return sanitizeRedirectPath(redirect);
}

export function resolveAuthRedirectPath(options: {
  state?: unknown;
  search?: string;
  fallback?: string;
} = {}): string {
  return (
    getRedirectPathFromState(options.state) ??
    getRedirectPathFromSearch(options.search ?? "") ??
    options.fallback ??
    DEFAULT_AUTH_REDIRECT
  );
}

export function buildLoginRedirectPath(currentPath: string): string {
  const redirectPath = sanitizeRedirectPath(currentPath);
  if (!redirectPath) {
    return LOGIN_PATH;
  }

  const params = new URLSearchParams({ redirect: redirectPath });
  return `${LOGIN_PATH}?${params.toString()}`;
}
