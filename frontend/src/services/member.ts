import request from "@/utils/request";

export async function getMembers(params?: any) {
  return request.get("/members/", { params });
}

export async function createMember(data: any) {
  return request.post("/members/", data);
}

export async function updateMember(memberId: number, data: any) {
  return request.put(`/members/${memberId}`, data);
}

export async function deleteMember(memberId: number) {
  return request.delete(`/members/${memberId}`);
}
