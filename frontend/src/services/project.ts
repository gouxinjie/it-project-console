import type {
  ProjectExternalResource,
  ProjectExternalResourceUpdatePayload,
  ProjectPage,
  ProjectPayload,
  ProjectQueryParams,
  ProjectResource,
  ProjectResourcePayload,
  ProjectResourceUpdatePayload,
  ProjectResourcesPayload,
  ProjectSummary,
  ProjectUpdatePayload,
} from "@/types/project";
import {
  createCacheKey,
  fetchWithCache,
  invalidateCacheByPrefix,
  prefetchWithCache,
} from "@/utils/cache";
import { invalidateMemberDetailCache } from "@/services/member";
import request from "@/utils/request";

const PROJECT_LIST_CACHE_PREFIX = "projects:list";
const PROJECT_DETAIL_CACHE_PREFIX = "projects:detail";
const PROJECT_RESOURCES_CACHE_PREFIX = "projects:resources";
const PROJECT_LIST_CACHE_TTL_MS = 45_000;
const PROJECT_DETAIL_CACHE_TTL_MS = 30_000;
const PROJECT_RESOURCES_CACHE_TTL_MS = 30_000;
const PROJECT_LIST_PAGE_LIMIT = 200;

function requestProjects(params?: ProjectQueryParams): Promise<ProjectPage> {
  return request.get<ProjectPage>("/projects/", { params });
}

function requestProject(projectId: number): Promise<ProjectSummary> {
  return request.get<ProjectSummary>(`/projects/${projectId}`);
}

function requestProjectResources(projectId: number): Promise<ProjectResourcesPayload> {
  return request.get<ProjectResourcesPayload>(`/projects/${projectId}/resources`);
}

function invalidateProjectCaches(projectId?: number): void {
  invalidateCacheByPrefix(PROJECT_LIST_CACHE_PREFIX);
  invalidateMemberDetailCache();
  if (projectId !== undefined) {
    invalidateCacheByPrefix(
      createCacheKey(PROJECT_DETAIL_CACHE_PREFIX, { projectId }),
    );
    invalidateCacheByPrefix(
      createCacheKey(PROJECT_RESOURCES_CACHE_PREFIX, { projectId }),
    );
  } else {
    invalidateCacheByPrefix(PROJECT_DETAIL_CACHE_PREFIX);
    invalidateCacheByPrefix(PROJECT_RESOURCES_CACHE_PREFIX);
  }
}

export async function getProjects(params?: ProjectQueryParams): Promise<ProjectPage> {
  const cacheKey = createCacheKey(PROJECT_LIST_CACHE_PREFIX, params);
  return fetchWithCache(
    cacheKey,
    () => requestProjects(params),
    PROJECT_LIST_CACHE_TTL_MS,
  );
}

export async function getAllProjects(
  params?: Omit<ProjectQueryParams, "skip" | "limit">,
): Promise<ProjectSummary[]> {
  const firstPage = await getProjects({
    ...params,
    skip: 0,
    limit: PROJECT_LIST_PAGE_LIMIT,
  });

  if (firstPage.total <= firstPage.items.length) {
    return firstPage.items;
  }

  const pageRequests: Array<Promise<ProjectPage>> = [];
  for (
    let skip = firstPage.items.length;
    skip < firstPage.total;
    skip += PROJECT_LIST_PAGE_LIMIT
  ) {
    pageRequests.push(
      getProjects({
        ...params,
        skip,
        limit: PROJECT_LIST_PAGE_LIMIT,
      }),
    );
  }

  const remainingPages = await Promise.all(pageRequests);
  return [...firstPage.items, ...remainingPages.flatMap((page) => page.items)].slice(
    0,
    firstPage.total,
  );
}

export function prefetchProjects(params?: ProjectQueryParams): void {
  const cacheKey = createCacheKey(PROJECT_LIST_CACHE_PREFIX, params);
  prefetchWithCache(
    cacheKey,
    () => requestProjects(params),
    PROJECT_LIST_CACHE_TTL_MS,
  );
}

export async function getProject(projectId: number): Promise<ProjectSummary> {
  const cacheKey = createCacheKey(PROJECT_DETAIL_CACHE_PREFIX, { projectId });
  return fetchWithCache(
    cacheKey,
    () => requestProject(projectId),
    PROJECT_DETAIL_CACHE_TTL_MS,
  );
}

export async function createProject(data: ProjectPayload): Promise<ProjectSummary> {
  const response = await request.post<ProjectSummary, ProjectPayload>("/projects/", data);
  invalidateProjectCaches();
  return response;
}

export async function updateProject(
  projectId: number,
  data: ProjectUpdatePayload,
): Promise<ProjectSummary> {
  const response = await request.put<ProjectSummary, ProjectUpdatePayload>(
    `/projects/${projectId}`,
    data,
  );
  invalidateProjectCaches(projectId);
  return response;
}

export async function deleteProject(projectId: number): Promise<{ message: string }> {
  const response = await request.delete<{ message: string }>(`/projects/${projectId}`);
  invalidateProjectCaches(projectId);
  return response;
}

export async function getProjectResources(
  projectId: number,
): Promise<ProjectResourcesPayload> {
  const cacheKey = createCacheKey(PROJECT_RESOURCES_CACHE_PREFIX, { projectId });
  return fetchWithCache(
    cacheKey,
    () => requestProjectResources(projectId),
    PROJECT_RESOURCES_CACHE_TTL_MS,
  );
}

export async function getProjectResource(
  projectId: number,
  resourceId: number,
): Promise<ProjectResource> {
  return request.get<ProjectResource>(`/projects/${projectId}/resources/${resourceId}`);
}

export async function createProjectResource(
  projectId: number,
  data: ProjectResourcePayload,
): Promise<ProjectResource> {
  const response = await request.post<ProjectResource, ProjectResourcePayload>(
    `/projects/${projectId}/resources`,
    data,
  );
  invalidateProjectCaches(projectId);
  return response;
}

export async function updateProjectResource(
  projectId: number,
  resourceId: number,
  data: ProjectResourceUpdatePayload,
): Promise<ProjectResource> {
  const response = await request.put<ProjectResource, ProjectResourceUpdatePayload>(
    `/projects/${projectId}/resources/${resourceId}`,
    data,
  );
  invalidateProjectCaches(projectId);
  return response;
}

export async function deleteProjectResource(
  resourceId: number,
): Promise<{ message: string }> {
  const response = await request.delete<{ message: string }>(
    `/projects/resources/${resourceId}`,
  );
  invalidateProjectCaches();
  return response;
}

export async function getProjectExternalResources(
  projectId: number,
): Promise<ProjectExternalResource> {
  return request.get<ProjectExternalResource>(
    `/projects/${projectId}/external-resources`,
  );
}

export async function updateProjectExternalResources(
  projectId: number,
  data: ProjectExternalResourceUpdatePayload,
): Promise<ProjectExternalResource> {
  const response = await request.put<
    ProjectExternalResource,
    ProjectExternalResourceUpdatePayload
  >(`/projects/${projectId}/external-resources`, data);
  invalidateProjectCaches(projectId);
  return response;
}

export async function deleteProjectExternalResources(
  projectId: number,
): Promise<{ message: string }> {
  const response = await request.delete<{ message: string }>(
    `/projects/${projectId}/external-resources`,
  );
  invalidateProjectCaches(projectId);
  return response;
}
