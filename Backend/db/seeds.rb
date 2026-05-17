# Roles
role_names = {
  'UC_PRESIDENT'   => 'Manages own UC report and members',
  'UC_SECRETARY'   => 'Assists with UC report entry',
  'ZONE_PRESIDENT' => 'Oversees zone UCs, locks zone reports',
  'ZONE_SECRETARY' => 'Assists zone-level operations',
  'ZILA_PRESIDENT' => 'Full access; assigns roles; finalizes reports',
  'ZILA_SECRETARY' => 'Assists Zila-level operations'
}
roles = {}
role_names.each { |name, desc| roles[name] = Role.find_or_create_by!(name: name) { |r| r.description = desc } }

# Permissions
perms_data = [
  ['auth:login',           'POST',   '/auth/login'],
  ['auth:refresh',         'POST',   '/auth/refresh'],
  ['auth:logout',          'POST',   '/auth/logout'],
  ['members:create',       'POST',   '/members'],
  ['members:list',         'GET',    '/members'],
  ['members:read',         'GET',    '/members/:id'],
  ['members:roles_assign', 'POST',   '/members/:id/roles'],
  ['members:roles_revoke', 'DELETE', '/members/:id/roles/:role_name'],
  ['units:list',           'GET',    '/units'],
  ['units:create',         'POST',   '/units'],
  ['units:read',           'GET',    '/units/:id'],
  ['units:update',         'PATCH',  '/units/:id'],
  ['reports:new',          'GET',    '/reports/new'],
  ['reports:create',       'POST',   '/reports'],
  ['reports:list',         'GET',    '/reports'],
  ['reports:read',         'GET',    '/reports/:id'],
  ['reports:update',       'PATCH',  '/reports/:id'],
  ['reports:lock_zone',    'POST',   '/reports/:id/lock-zone'],
  ['reports:finalize',     'POST',   '/reports/:id/finalize'],
  ['reports:export',       'GET',    '/reports/export'],
  ['activities:list',      'GET',    '/activities'],
  ['activities:create',    'POST',   '/activities'],
  ['audit_logs:read',      'GET',    '/audit-logs'],
]
perms = {}
perms_data.each do |name, method, path|
  perms[name] = Permission.find_or_create_by!(name: name) { |p| p.method = method; p.path = path }
end

# Role-permission mapping
role_perm_map = {
  'UC_PRESIDENT'   => %w[members:create members:list members:read units:list units:read reports:new reports:create reports:list reports:read reports:update reports:export activities:list],
  'UC_SECRETARY'   => %w[members:list members:read units:list units:read reports:new reports:create reports:list reports:read reports:update activities:list],
  'ZONE_PRESIDENT' => %w[members:create members:list members:read units:list units:read reports:new reports:list reports:read reports:update reports:lock_zone reports:export activities:list],
  'ZONE_SECRETARY' => %w[members:list members:read units:list units:read reports:new reports:list reports:read reports:update activities:list],
  'ZILA_PRESIDENT' => perms_data.map(&:first),
  'ZILA_SECRETARY' => %w[units:list units:read members:list members:read reports:list reports:read reports:export activities:list audit_logs:read],
}
role_perm_map.each do |role_name, perm_names|
  role = roles[role_name]
  perm_names.each do |perm_name|
    RolePermission.find_or_create_by!(role: role, permission: perms[perm_name])
  end
end

# Activity definitions
[
  ['Youth Meeting', 'uc', 1],
  ['Study Circle',  'uc', 0],
  ['Sports Event',  'uc', 0],
].each do |name, scope, comp|
  ActivityDefinition.find_or_create_by!(name: name, scope_level: scope) { |a| a.compulsory_per_month = comp }
end

# Form sections
sections_data = [
  ['leadership',      'Leadership Info',       'uc',   1],
  ['youth_meeting',   'Monthly Youth Meeting', 'uc',   2],
  ['team_changes',    'Team Changes',          'uc',   3],
  ['activities',      'Activities',            'uc',   4],
  ['zone_summary',    'Zone Summary',          'zone', 1],
  ['zone_activities', 'Zone Activities',       'zone', 2],
  ['zila_summary',    'Zila Summary',          'zila', 1],
]
sections = {}
sections_data.each do |key, label, scope, idx|
  sections[key] = FormSection.find_or_create_by!(key: key) { |s| s.label = label; s.scope_level = scope; s.order_index = idx }
end

# Form fields
fields_data = [
  ['president_member_id', 'President (Sadar)',       'member_picker', true,  'unit.president_id',               nil, nil, nil],
  ['secretary_member_id', 'Secretary',               'member_picker', true,  'last_report.secretary_member_id', nil, nil, "Prefilled from last month's report. Change if needed."],
  ['youth_meeting_held',  'Was youth meeting held?', 'boolean',       true,  nil,                               nil, nil, nil],
  ['youth_meeting_date',  'Meeting date',            'date',          false, nil,                               nil, nil, 'Required if meeting was held.'],
  ['rukan_count',         'Rukan count',             'number',        false, nil,                               nil, { min: 0 }, nil],
  ['umeedwar_count',      'Umeedwar count',          'number',        false, nil,                               nil, { min: 0 }, nil],
  ['youth_member_count',  'Youth members',           'number',        false, nil,                               nil, { min: 0 }, nil],
  ['activities',          'Activities',              'activity_list', false, nil,                               nil, nil, 'Add all activities conducted this month. Compulsory activities are marked.'],
]
fields = {}
fields_data.each do |key, label, ftype, req, prefill, opts, val, helper|
  fields[key] = FormField.find_or_create_by!(key: key) do |f|
    f.label = label; f.field_type = ftype; f.is_required = req
    f.prefill_source = prefill; f.options = opts; f.validation = val; f.helper_text = helper
  end
end

# Form section fields
section_fields = [
  ['leadership',    'president_member_id', 1],
  ['leadership',    'secretary_member_id', 2],
  ['youth_meeting', 'youth_meeting_held',  1],
  ['youth_meeting', 'youth_meeting_date',  2],
  ['team_changes',  'rukan_count',         1],
  ['team_changes',  'umeedwar_count',      2],
  ['team_changes',  'youth_member_count',  3],
  ['activities',    'activities',          1],
]
section_fields.each do |sec_key, field_key, idx|
  FormSectionField.find_or_create_by!(section: sections[sec_key], field: fields[field_key]) { |sf| sf.order_index = idx }
end

puts "Seeds complete."
