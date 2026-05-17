import apiClient from '@/lib/apiClient'
import type { ActivityDefinition, ScopeLevel } from '@/types'

export interface ListActivitiesParams {
  scope_level?: ScopeLevel
  is_active?: boolean
}

export async function listActivities(
  params?: ListActivitiesParams
): Promise<{ data: ActivityDefinition[] }> {
  const { data } = await apiClient.get<{ data: ActivityDefinition[] }>('/activities', { params })
  return data
}

export async function createActivity(payload: {
  name: string
  scope_level: ScopeLevel
  compulsory_per_month: number
}): Promise<ActivityDefinition> {
  const { data } = await apiClient.post<ActivityDefinition>('/activities', payload)
  return data
}
