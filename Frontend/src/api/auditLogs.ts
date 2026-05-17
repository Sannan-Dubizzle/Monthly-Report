import apiClient from '@/lib/apiClient'
import type { AuditLog } from '@/types'

export async function getAuditLogs(
  entityType: string,
  entityId: string
): Promise<{ data: AuditLog[] }> {
  const { data } = await apiClient.get<{ data: AuditLog[] }>('/audit-logs', {
    params: { entity_type: entityType, entity_id: entityId },
  })
  return data
}
