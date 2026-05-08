import {
  clearCacheStore,
  createCacheKey,
  fetchWithCache,
  invalidateCacheByPrefix,
} from "@/utils/cache";
import type { AuthSettings, User, UserRegisterPayload } from "@/types/user";
import request from "@/utils/request";

const CURRENT_USER_CACHE_PREFIX = "auth:current-user";
const AUTH_SETTINGS_CACHE_PREFIX = "auth:settings";
const CURRENT_USER_CACHE_TTL_MS = 5 * 60_000;
const AUTH_SETTINGS_CACHE_TTL_MS = 5 * 60_000;

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

function requestCurrentUser(): Promise<User> {
  return request.get<User>("/login/me");
}

function requestAuthSettings(): Promise<AuthSettings> {
  return request.get<AuthSettings>("/login/settings");
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

export async function register(data: UserRegisterPayload): Promise<User> {
  const response = await request.post<User, UserRegisterPayload>("/login/register", data);
  invalidateCacheByPrefix(AUTH_SETTINGS_CACHE_PREFIX);
  return response;
}

export async function getCurrentUser(): Promise<User> {
  const token = localStorage.getItem("token") ?? "guest";
  const cacheKey = createCacheKey(CURRENT_USER_CACHE_PREFIX, { token });
  return fetchWithCache(
    cacheKey,
    () => requestCurrentUser(),
    CURRENT_USER_CACHE_TTL_MS,
  );
}

export async function getAuthSettings(): Promise<AuthSettings> {
  const cacheKey = createCacheKey(AUTH_SETTINGS_CACHE_PREFIX);
  return fetchWithCache(
    cacheKey,
    requestAuthSettings,
    AUTH_SETTINGS_CACHE_TTL_MS,
  );
}

export function invalidateCurrentUserCache(): void {
  invalidateCacheByPrefix(CURRENT_USER_CACHE_PREFIX);
}

export function clearAuthRelatedCaches(): void {
  clearCacheStore();
}
