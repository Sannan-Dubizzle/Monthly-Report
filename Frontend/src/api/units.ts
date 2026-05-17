import apiClient from '@/lib/apiClient'
import type { Unit, UnitWithAncestors, ScopeLevel, PaginatedResponse } from '@/types'

export interface ListUnitsParams {
  scope_level?: ScopeLevel
  parent_id?: string
}

export async function listUnits(params?: ListUnitsParams): Promise<{ data: Unit[]; meta: { total: number } }> {
  const { data } = await apiClient.get('/units', { params })
  return data
}

export async function getUnit(id: string, includeAncestors = false): Promise<UnitWithAncestors> {
  const params = includeAncestors ? { include: 'ancestors' } : undefined
  const { data } = await apiClient.get<UnitWithAncestors>(`/units/${id}`, { params })
  return data
}

export async function createUnit(payload: {
  name: string
  scope_level: ScopeLevel
  parent_id: string
}): Promise<Unit> {
  const { data } = await apiClient.post<Unit>('/units', payload)
  return data
}

export async function updateUnit(
  id: string,
  payload: {
    name?: string
    parent_id?: string
    president_id?: string
  }
): Promise<Unit> {
  const { data } = await apiClient.patch<Unit>(`/units/${id}`, payload)
  return data
}
