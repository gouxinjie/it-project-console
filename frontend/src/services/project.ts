import request from "@/utils/request";

// 项目相关 API
export async function getProjects(params?: any) {
  return request.get("/projects/", { params });
}

export async function getProject(projectId: number) {
  return request.get(`/projects/${projectId}`);
}

export async function createProject(data: any) {
  return request.post("/projects/", data);
}

export async function updateProject(projectId: number, data: any) {
  return request.put(`/projects/${projectId}`, data);
}

export async function deleteProject(projectId: number) {
  return request.delete(`/projects/${projectId}`);
}

// 项目资源相关 API
export async function getProjectResources(projectId: number) {
  return request.get(`/projects/${projectId}/resources`);
}

export async function getProjectResource(projectId: number, resourceId: number) {
  return request.get(`/projects/${projectId}/resources/${resourceId}`);
}

export async function createProjectResource(projectId: number, data: any) {
  return request.post(`/projects/${projectId}/resources`, data);
}

export async function updateProjectResource(projectId: number, resourceId: number, data: any) {
  return request.put(`/projects/${projectId}/resources/${resourceId}`, data);
}

export async function deleteProjectResource(resourceId: number) {
  return request.delete(`/projects/resources/${resourceId}`);
}

// 外部资源相关 API
export async function getProjectExternalResources(projectId: number) {
  return request.get(`/projects/${projectId}/external-resources`);
}

export async function updateProjectExternalResources(projectId: number, data: any) {
  return request.put(`/projects/${projectId}/external-resources`, data);
}

export async function deleteProjectExternalResources(projectId: number) {
  return request.delete(`/projects/${projectId}/external-resources`);
}
