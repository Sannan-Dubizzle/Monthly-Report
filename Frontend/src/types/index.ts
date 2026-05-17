// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role =
  | 'UC_PRESIDENT'
  | 'UC_SECRETARY'
  | 'ZONE_PRESIDENT'
  | 'ZONE_SECRETARY'
  | 'ZILA_PRESIDENT'
  | 'ZILA_SECRETARY'

export type Permission =
  | 'members:create'
  | 'members:list'
  | 'members:read'
  | 'members:update'
  | 'reports:create'
  | 'reports:list'
  | 'reports:read'
  | 'reports:update'
  | 'reports:lock_zone'
  | 'reports:finalize'
  | 'reports:export'
  | 'activities:list'
  | 'activities:create'
  | 'units:list'
  | 'units:read'
  | 'units:create'
  | 'units:update'
  | 'roles:assign'
  | 'roles:revoke'
  | 'audit_logs:read'

export interface AuthMember {
  id: string
  name: string
  email: string
  uc_id: string
  roles: Role[]
  permissions: Permission[]
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  member: AuthMember
}

export interface RefreshResponse {
  access_token: string
  expires_in: number
}

// ─── Units ───────────────────────────────────────────────────────────────────

export type ScopeLevel = 'UC' | 'Zone' | 'Zila'

export interface UnitPresident {
  id: string
  name: string
}

export interface Unit {
  id: string
  name: string
  scope_level: ScopeLevel
  parent_id: string | null
  president: UnitPresident | null
  created_at?: string
  updated_at?: string
}

export interface UnitWithAncestors extends Unit {
  ancestors?: Array<{
    id: string
    name: string
    scope_level: ScopeLevel
  }>
}

// ─── Members ─────────────────────────────────────────────────────────────────

export interface MemberUC {
  id: string
  name: string
  scope_level?: ScopeLevel
}

export interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  uc: MemberUC
  roles: Role[]
  created_at?: string
  updated_at?: string
}

export interface MemberListItem {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  uc: MemberUC
  roles: Role[]
}

// ─── Activities ──────────────────────────────────────────────────────────────

export interface ActivityDefinition {
  id: string
  name: string
  scope_level: ScopeLevel
  compulsory_per_month: number
  is_active: boolean
}

export interface ActivityOccurrence {
  id: string
  definition_id: string | null
  name: string
  occurrences: number
  avg_attendance: number | null
  conductor: string | null
  notes: string | null
}

export interface ActivityOccurrenceInput {
  definition_id: string | null
  name: string
  occurrences: number
  avg_attendance: number | null
  conductor: string | null
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportStatus = 'draft' | 'zone_locked' | 'finalized'

export interface FieldValue {
  field_id: string
  field_key: string
  value: string | null
}

export interface ReportUnit {
  id: string
  name: string
  scope_level: ScopeLevel
  parent_id: string | null
}

export interface Report {
  id: string
  status: ReportStatus
  unit: ReportUnit
  month: string
  president_member_id: string | null
  secretary_member_id: string | null
  activities: ActivityOccurrence[]
  field_values: FieldValue[]
  created_at: string
  updated_at: string
  locked_at: string | null
  finalized_at: string | null
}

export interface ReportListItem {
  id: string
  unit_id: string
  unit_name: string
  unit_scope: ScopeLevel
  month: string
  status: ReportStatus
  president: string | null
  created_at: string
}

// ─── Report Form Schema ───────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'dropdown'
  | 'member_picker'
  | 'activity_list'

export interface ActivityListOptions {
  definitions: Array<{
    id: string
    name: string
    compulsory_per_month: number
  }>
  allow_custom: boolean
}

export interface FormField {
  key: string
  label: string
  type: FieldType
  is_required: boolean
  prefill_value: unknown
  options: ActivityListOptions | Array<{ value: string; label: string }> | null
  validation: { min?: number; max?: number } | null
  helper_text: string | null
}

export interface FormSection {
  key: string
  label: string
  order_index: number
  fields: FormField[]
}

export interface NewReportSchema {
  unit: {
    id: string
    name: string
    scope_level: ScopeLevel
  }
  month: string
  sections: FormSection[]
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: {
    id: string
    name: string
  }
  changed_at: string
}

// ─── Pagination Meta ─────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  message: string
  [key: string]: unknown
}
