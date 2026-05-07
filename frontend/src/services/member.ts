import type { Member, MemberPage, MemberPayload, MemberQueryParams } from "@/types/member";
import { createCacheKey, fetchWithCache, invalidateCacheByPrefix, prefetchWithCache } from "@/utils/cache";
import request from "@/utils/request";

const MEMBERS_CACHE_PREFIX = "members";
const MEMBERS_CACHE_TTL_MS = 60_000;

function requestMembers(params?: MemberQueryParams): Promise<MemberPage> {
  return request.get<MemberPage>("/members/", { params });
}

export async function getMembers(params?: MemberQueryParams): Promise<MemberPage> {
  const cacheKey = createCacheKey(MEMBERS_CACHE_PREFIX, params);
  return fetchWithCache(
    cacheKey,
    () => requestMembers(params),
    MEMBERS_CACHE_TTL_MS,
  );
}

export function prefetchMembers(params?: MemberQueryParams): void {
  const cacheKey = createCacheKey(MEMBERS_CACHE_PREFIX, params);
  prefetchWithCache(
    cacheKey,
    () => requestMembers(params),
    MEMBERS_CACHE_TTL_MS,
  );
}

export async function createMember(data: MemberPayload): Promise<Member> {
  const response = await request.post<Member, MemberPayload>("/members/", data);
  invalidateCacheByPrefix(MEMBERS_CACHE_PREFIX);
  return response;
}

export async function updateMember(
  memberId: number,
  data: Partial<MemberPayload>,
): Promise<Member> {
  const response = await request.put<Member, Partial<MemberPayload>>(
    `/members/${memberId}`,
    data,
  );
  invalidateCacheByPrefix(MEMBERS_CACHE_PREFIX);
  return response;
}

export async function deleteMember(memberId: number): Promise<Member> {
  const response = await request.delete<Member>(`/members/${memberId}`);
  invalidateCacheByPrefix(MEMBERS_CACHE_PREFIX);
  return response;
}
