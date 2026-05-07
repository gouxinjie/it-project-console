import type { PaginatedResponse } from "@/types/common";

export interface MemberBrief {
  member_id: number;
  member_name: string;
  position: string;
}

export interface Member extends MemberBrief {
  tech_stack: string | null;
  phone: string | null;
  email: string | null;
  create_time: string;
  update_time: string;
}

export interface MemberPayload {
  member_name: string;
  position: string;
  tech_stack?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface MemberQueryParams {
  skip?: number;
  limit?: number;
  search?: string;
}

export type MemberPage = PaginatedResponse<Member>;
