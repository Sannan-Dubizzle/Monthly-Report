import apiClient from '@/lib/apiClient'
import type { Member, MemberListItem, PaginatedResponse, Role } from '@/types'

export interface ListMembersParams {
  uc_id?: string
  role?: Role
  page?: number
  per_page?: number
}

export async function listMembers(
  params?: ListMembersParams
): Promise<PaginatedResponse<MemberListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<MemberListItem>>('/members', { params })
  return data
}

export async function getMember(id: string): Promise<Member> {
  const { data } = await apiClient.get<Member>(`/members/${id}`)
  return data
}

export async function createMember(payload: {
  name: string
  email: string
  phone?: string
  password: string
  uc_id: string
}): Promise<Member> {
  const { data } = await apiClient.post<Member>('/members', payload)
  return data
}

export async function assignRole(
  memberId: string,
  roleName: Role
): Promise<{ member_id: string; role: Role; granted_by: string; granted_at: string }> {
  const { data } = await apiClient.post(`/members/${memberId}/roles`, { role_name: roleName })
  return data
}

export async function revokeRole(
  memberId: string,
  roleName: Role
): Promise<{ member_id: string; role: Role; revoked_by: string; revoked_at: string }> {
  const { data } = await apiClient.delete(`/members/${memberId}/roles/${roleName}`)
  return data
}
