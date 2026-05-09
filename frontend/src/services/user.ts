import { invalidateCurrentUserCache } from "@/services/auth";
import type {
  SelfPasswordUpdatePayload,
  User,
  UserCreatePayload,
  UserPage,
  UserPasswordResetPayload,
  UserQueryParams,
  UserUpdatePayload,
} from "@/types/user";
import request from "@/utils/request";

/**
 * 分页获取后台账号列表（管理员权限）
 */
export async function getUsers(params?: UserQueryParams): Promise<UserPage> {
  return request.get<UserPage>("/users/", { params });
}

/**
 * 创建新的后台账号
 */
export async function createUser(data: UserCreatePayload): Promise<User> {
  return request.post<User, UserCreatePayload>("/users/", data);
}

/**
 * 更新账号信息（管理员权限）
 */
export async function updateUser(
  userId: number,
  data: UserUpdatePayload,
): Promise<User> {
  const response = await request.put<User, UserUpdatePayload>(`/users/${userId}`, data);
  // 更新后失效当前用户缓存，确保信息同步
  invalidateCurrentUserCache();
  return response;
}

/**
 * 重置指定用户的密码（管理员权限）
 */
export async function resetUserPassword(
  userId: number,
  data: UserPasswordResetPayload,
): Promise<{ message: string }> {
  return request.put<{ message: string }, UserPasswordResetPayload>(
    `/users/${userId}/password`,
    data,
  );
}

/**
 * 删除后台账号
 */
export async function deleteUser(userId: number): Promise<{ message: string }> {
  const response = await request.delete<{ message: string }>(`/users/${userId}`);
  invalidateCurrentUserCache();
  return response;
}

/**
 * 修改当前登录用户自己的密码
 */
export async function updateMyPassword(
  data: SelfPasswordUpdatePayload,
): Promise<{ message: string }> {
  return request.put<{ message: string }, SelfPasswordUpdatePayload>(
    "/users/me/password",
    data,
  );
}
