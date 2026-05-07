import type { PaginatedResponse } from "@/types/common";
import type { MemberBrief } from "@/types/member";

export interface ProjectSummary {
  project_id: number;
  project_name: string;
  project_type: string;
  project_status: string;
  project_desc: string | null;
  tech_framework: string | null;
  business_unit: string;
  business_type: string;
  belong_system: string;
  remarks: string | null;
  update_time: string;
  has_external_resources: boolean;
  project_leaders: MemberBrief[];
  project_leader_ids: number[];
}

export interface ProjectPayload {
  project_name: string;
  project_type: string;
  project_status: string;
  project_desc?: string | null;
  tech_framework?: string | null;
  business_unit: string;
  business_type: string;
  belong_system: string;
  remarks?: string | null;
  project_leader_ids: number[];
}

export interface ProjectUpdatePayload
  extends Partial<Omit<ProjectPayload, "project_leader_ids">> {
  project_leader_ids?: number[];
}

export interface ProjectQueryParams {
  skip?: number;
  limit?: number;
  project_type?: string;
  project_status?: string;
  business_unit?: string;
  business_type?: string;
  belong_system?: string;
  project_leader?: string;
  project_leader_id?: number;
  start_time?: string;
  end_time?: string;
}

export type ProjectPage = PaginatedResponse<ProjectSummary>;

export interface ProjectResource {
  resource_id: number;
  project_id: number;
  resource_type: string;
  git_repo: string | null;
  deploy_branch: string | null;
  deploy_method: string | null;
  deploy_addr: string | null;
  deploy_steps: string | null;
  prod_domain: string | null;
  uat_domain: string | null;
  tech_framework: string | null;
  resource_remarks: string | null;
  special_note: string | null;
  update_time: string;
  developers: MemberBrief[];
  developer_ids: number[];
}

export interface ProjectResourcePayload {
  resource_type: string;
  git_repo?: string | null;
  deploy_branch?: string | null;
  deploy_method?: string | null;
  deploy_addr?: string | null;
  deploy_steps?: string | null;
  prod_domain?: string | null;
  uat_domain?: string | null;
  tech_framework?: string | null;
  resource_remarks?: string | null;
  special_note?: string | null;
  developer_ids: number[];
}

export interface ProjectResourceUpdatePayload
  extends Partial<Omit<ProjectResourcePayload, "developer_ids">> {
  developer_ids?: number[];
}

export interface ProjectExternalResource {
  external_id: number;
  project_id: number;
  aliyun_oss: string | null;
  database_config: string | null;
  redis_config: string | null;
  middleware_config: string | null;
  other_config: string | null;
  create_time: string;
  update_time: string;
}

export type ProjectExternalResourceUpdatePayload = Partial<
  Pick<
    ProjectExternalResource,
    | "aliyun_oss"
    | "database_config"
    | "redis_config"
    | "middleware_config"
    | "other_config"
  >
>;

export interface ProjectResourcesPayload {
  resources: ProjectResource[];
  external_resources: ProjectExternalResource | null;
}
