import {
  clearCacheStore,
  createCacheKey,
  fetchWithCache,
  invalidateCacheByPrefix,
} from "@/utils/cache";
import type { AuthSettings, User, UserRegisterPayload } from "@/types/user";
import request from "@/utils/request";

// 缓存相关常量配置
const CURRENT_USER_CACHE_PREFIX = "auth:current-user";
const AUTH_SETTINGS_CACHE_PREFIX = "auth:settings";
const CURRENT_USER_CACHE_TTL_MS = 5 * 60_000; // 5分钟缓存
const AUTH_SETTINGS_CACHE_TTL_MS = 5 * 60_000;

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

/**
 * 请求后端接口获取当前用户信息
 */
function requestCurrentUser(): Promise<User> {
  return request.get<User>("/login/me");
}

/**
 * 请求后端获取认证相关的配置（如是否允许公开注册）
 */
function requestAuthSettings(): Promise<AuthSettings> {
  return request.get<AuthSettings>("/login/settings");
}

/**
 * 登录操作
 * 注意：FastAPI 默认使用表单格式接收登录数据，所以需要转换为 URLSearchParams
 */
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
  // 登录成功后清除所有前端缓存，确保数据一致性
  clearCacheStore();
  invalidateCacheByPrefix(CURRENT_USER_CACHE_PREFIX);
  return response;
}

/**
 * 注册新用户
 */
export async function register(data: UserRegisterPayload): Promise<User> {
  const response = await request.post<User, UserRegisterPayload>("/login/register", data);
  invalidateCacheByPrefix(AUTH_SETTINGS_CACHE_PREFIX);
  return response;
}

/**
 * 获取当前用户信息（带缓存机制）
 */
export async function getCurrentUser(): Promise<User> {
  const token = localStorage.getItem("token") ?? "guest";
  const cacheKey = createCacheKey(CURRENT_USER_CACHE_PREFIX, { token });
  return fetchWithCache(
    cacheKey,
    () => requestCurrentUser(),
    CURRENT_USER_CACHE_TTL_MS,
  );
}

/**
 * 获取认证配置（带缓存机制）
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  const cacheKey = createCacheKey(AUTH_SETTINGS_CACHE_PREFIX);
  return fetchWithCache(
    cacheKey,
    requestAuthSettings,
    AUTH_SETTINGS_CACHE_TTL_MS,
  );
}

/**
 * 失效当前用户的缓存
 */
export function invalidateCurrentUserCache(): void {
  invalidateCacheByPrefix(CURRENT_USER_CACHE_PREFIX);
}

/**
 * 清除所有认证相关的缓存
 */
export function clearAuthRelatedCaches(): void {
  clearCacheStore();
}
