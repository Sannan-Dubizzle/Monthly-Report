import apiClient from '@/lib/apiClient'
import type {
  Report,
  ReportListItem,
  ReportStatus,
  NewReportSchema,
  ActivityOccurrenceInput,
  PaginatedResponse,
} from '@/types'

// ─── List ─────────────────────────────────────────────────────────────────────

export interface ListReportsParams {
  unit_id?: string
  month?: string
  status?: ReportStatus
  page?: number
  per_page?: number
}

export async function listReports(
  params?: ListReportsParams
): Promise<PaginatedResponse<ReportListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ReportListItem>>('/reports', { params })
  return data
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getReport(id: string, includeAncestors = false): Promise<Report> {
  const params = includeAncestors ? { include: 'ancestors' } : undefined
  const { data } = await apiClient.get<Report>(`/reports/${id}`, { params })
  return data
}

// ─── New Report Form Schema ───────────────────────────────────────────────────

export async function getNewReportSchema(unitId: string): Promise<NewReportSchema> {
  const { data } = await apiClient.get<NewReportSchema>('/reports/new', {
    params: { unit_id: unitId },
  })
  return data
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateReportPayload {
  unit_id: string
  month: string
  president_member_id?: string | null
  secretary_member_id?: string | null
  activities: ActivityOccurrenceInput[]
  field_values: Array<{ field_id: string; value: string | null }>
}

export async function createReport(payload: CreateReportPayload): Promise<Report> {
  const { data } = await apiClient.post<Report>('/reports', payload)
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateReportPayload {
  president_member_id?: string | null
  secretary_member_id?: string | null
  field_values?: Array<{ field_id: string; value: string | null }>
  activities?: {
    add?: ActivityOccurrenceInput[]
    update?: Array<{
      id: string
      occurrences?: number
      avg_attendance?: number | null
      conductor?: string | null
      notes?: string | null
    }>
    remove?: string[]
  }
}

export async function updateReport(id: string, payload: UpdateReportPayload): Promise<Report> {
  const { data } = await apiClient.patch<Report>(`/reports/${id}`, payload)
  return data
}

// ─── Lock & Finalize ──────────────────────────────────────────────────────────

export async function lockZone(reportId: string): Promise<{
  locked_report_ids: string[]
  locked_at: string
  locked_by: string
}> {
  const { data } = await apiClient.post(`/reports/${reportId}/lock-zone`)
  return data
}

export async function finalizeReports(reportId: string): Promise<{
  finalized_report_ids: string[]
  finalized_at: string
  finalized_by: string
}> {
  const { data } = await apiClient.post(`/reports/${reportId}/finalize`)
  return data
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportReport(unitId: string, month: string): Promise<Blob> {
  const { data } = await apiClient.get('/reports/export', {
    params: { unit_id: unitId, month },
    responseType: 'blob',
  })
  return data
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
