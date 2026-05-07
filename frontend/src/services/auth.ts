import {
  clearCacheStore,
  createCacheKey,
  fetchWithCache,
  invalidateCacheByPrefix,
} from "@/utils/cache";
import request from "@/utils/request";

const CURRENT_USER_CACHE_PREFIX = "auth:current-user";
const CURRENT_USER_CACHE_TTL_MS = 5 * 60_000;

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

function requestCurrentUser(): Promise<CurrentUser> {
  return request.get<CurrentUser>("/login/me");
}

export async function login(data: LoginPayload): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append("username", data.username);
  params.append("password", data.password);

  const response = await request.post<LoginResponse, URLSearchParams>(
    "/login/access-token",
    params,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  clearCacheStore();
  invalidateCacheByPrefix(CURRENT_USER_CACHE_PREFIX);
  return response;
}

export async function register(data: Record<string, unknown>) {
  return request.post("/login/register", data);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = localStorage.getItem("token") ?? "guest";
  const cacheKey = createCacheKey(CURRENT_USER_CACHE_PREFIX, { token });
  return fetchWithCache(
    cacheKey,
    () => requestCurrentUser(),
    CURRENT_USER_CACHE_TTL_MS,
  );
}

export function invalidateCurrentUserCache(): void {
  invalidateCacheByPrefix(CURRENT_USER_CACHE_PREFIX);
}

export function clearAuthRelatedCaches(): void {
  clearCacheStore();
}
