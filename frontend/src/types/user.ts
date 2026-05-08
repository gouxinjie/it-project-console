import type { PaginatedResponse } from "@/types/common";

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  create_time: string;
  last_login: string | null;
}

export interface AuthSettings {
  allow_public_registration: boolean;
}

export interface UserRegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface UserCreatePayload extends UserRegisterPayload {
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UserUpdatePayload {
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UserQueryParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface UserPasswordResetPayload {
  new_password: string;
}

export interface SelfPasswordUpdatePayload {
  current_password: string;
  new_password: string;
}

export type UserPage = PaginatedResponse<User>;
