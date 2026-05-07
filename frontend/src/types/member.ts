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

export interface MemberLeadProjectSummary {
  project_id: number;
  project_name: string;
  project_type: string;
  project_status: string;
  business_unit: string;
  update_time: string;
}

export interface MemberResourceProjectSummary {
  project_id: number;
  project_name: string;
  project_type: string;
  project_status: string;
  business_unit: string;
}

export interface MemberDevelopedResourceSummary {
  resource_id: number;
  resource_type: string;
  git_repo: string | null;
  tech_framework: string | null;
  deploy_branch: string | null;
  prod_domain: string | null;
  update_time: string;
  project: MemberResourceProjectSummary | null;
}

export interface MemberDetail extends Member {
  lead_projects: MemberLeadProjectSummary[];
  developed_resources: MemberDevelopedResourceSummary[];
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
