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

export async function getUsers(params?: UserQueryParams): Promise<UserPage> {
  return request.get<UserPage>("/users/", { params });
}

export async function createUser(data: UserCreatePayload): Promise<User> {
  return request.post<User, UserCreatePayload>("/users/", data);
}

export async function updateUser(
  userId: number,
  data: UserUpdatePayload,
): Promise<User> {
  const response = await request.put<User, UserUpdatePayload>(`/users/${userId}`, data);
  invalidateCurrentUserCache();
  return response;
}

export async function resetUserPassword(
  userId: number,
  data: UserPasswordResetPayload,
): Promise<{ message: string }> {
  return request.put<{ message: string }, UserPasswordResetPayload>(
    `/users/${userId}/password`,
    data,
  );
}

export async function deleteUser(userId: number): Promise<{ message: string }> {
  const response = await request.delete<{ message: string }>(`/users/${userId}`);
  invalidateCurrentUserCache();
  return response;
}

export async function updateMyPassword(
  data: SelfPasswordUpdatePayload,
): Promise<{ message: string }> {
  return request.put<{ message: string }, SelfPasswordUpdatePayload>(
    "/users/me/password",
    data,
  );
}
