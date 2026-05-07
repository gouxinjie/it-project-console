import type {
  Member,
  MemberDetail,
  MemberPage,
  MemberPayload,
  MemberQueryParams,
} from "@/types/member";
import { createCacheKey, fetchWithCache, invalidateCacheByPrefix, prefetchWithCache } from "@/utils/cache";
import request from "@/utils/request";

const MEMBERS_CACHE_PREFIX = "members";
const MEMBER_DETAIL_CACHE_PREFIX = "members:detail";
const MEMBERS_CACHE_TTL_MS = 60_000;
const MEMBER_DETAIL_CACHE_TTL_MS = 30_000;

function requestMembers(params?: MemberQueryParams): Promise<MemberPage> {
  return request.get<MemberPage>("/members/", { params });
}

function requestMemberDetail(memberId: number): Promise<MemberDetail> {
  return request.get<MemberDetail>(`/members/${memberId}`);
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

export async function getMemberDetail(memberId: number): Promise<MemberDetail> {
  const cacheKey = createCacheKey(MEMBER_DETAIL_CACHE_PREFIX, { memberId });
  return fetchWithCache(
    cacheKey,
    () => requestMemberDetail(memberId),
    MEMBER_DETAIL_CACHE_TTL_MS,
  );
}

export function invalidateMemberDetailCache(): void {
  invalidateCacheByPrefix(MEMBER_DETAIL_CACHE_PREFIX);
}

export async function createMember(data: MemberPayload): Promise<Member> {
  const response = await request.post<Member, MemberPayload>("/members/", data);
  invalidateCacheByPrefix(MEMBERS_CACHE_PREFIX);
  invalidateMemberDetailCache();
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
  invalidateMemberDetailCache();
  return response;
}

export async function deleteMember(memberId: number): Promise<Member> {
  const response = await request.delete<Member>(`/members/${memberId}`);
  invalidateCacheByPrefix(MEMBERS_CACHE_PREFIX);
  invalidateMemberDetailCache();
  return response;
}
