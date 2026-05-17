# Monthly Reporting System — Finalized Backend Specification

---

## 1. Overview

Hierarchical monthly reporting platform for an organization structured as:

```
Zila (District)
  └── Zone
        └── UC (Union Council / Halqa)
```

- Every **Member** belongs to exactly one UC
- Members can hold **multiple roles** at different unit levels
- Reports flow **bottom-up**: UC → Zone → Zila
- Reports are **editable until locked** at each level
- Authentication via **Email + Password**

---

## 2. Database Schema

### 2.1 `units` — Unified Hierarchy Table

Replaces separate `zilas`, `zones`, `ucs` tables using self-association.

```sql
-- Step 1: create units without president_id (members doesn't exist yet)
CREATE TABLE units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  parent_id   UUID REFERENCES units(id) ON DELETE RESTRICT,
  scope_level ENUM('Zila', 'Zone', 'UC') NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_scope_root CHECK (
    (scope_level = 'Zila' AND parent_id IS NULL)
    OR (scope_level IN ('Zone', 'UC') AND parent_id IS NOT NULL)
  )
);

-- Step 2: create members (references units — safe now)
-- See 2.2 below.

-- Step 3: add president_id to units after members exists
ALTER TABLE units
  ADD COLUMN president_id UUID REFERENCES members(id) ON DELETE SET NULL;
```

**Notes:**
- Migration order is mandatory: `units` (no `president_id`) → `members` → `ALTER TABLE units ADD COLUMN president_id`
- `president_id` is always optional — a unit may not have a president assigned yet
- A Zila has `parent_id = NULL`; a Zone's parent must be a Zila; a UC's parent must be a Zone (enforced at application layer)
- Scope-parent consistency (Zone's parent is a Zila, not another UC) is enforced at the application layer on create/update

---

### 2.2 `members`

```sql
CREATE TABLE members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  uc_id         UUID NOT NULL REFERENCES units(id),  -- must be scope_level='UC'
  created_by    UUID REFERENCES members(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `email` is required and used for login — the only auth method is email + password
- `phone` is optional, stored for contact purposes only
- `password_hash` is required — use bcrypt with cost factor ≥ 12
- `uc_id` must reference a unit with `scope_level = 'UC'` (enforced at application layer)
- `created_by` tracks who registered this member

---

### 2.3 `roles`

Global positional roles. Roles are not scoped to any specific unit — permissions determine what a role can do org-wide. A member can hold multiple roles.

```sql
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Seed data:**

| name            | description                                      |
|-----------------|--------------------------------------------------|
| UC_PRESIDENT    | Manages own UC report and members                |
| UC_SECRETARY    | Assists with UC report entry                     |
| ZONE_PRESIDENT  | Oversees zone UCs, locks zone reports            |
| ZONE_SECRETARY  | Assists zone-level operations                    |
| ZILA_PRESIDENT  | Full access; assigns roles; finalizes reports    |
| ZILA_SECRETARY  | Assists Zila-level operations                    |

---

### 2.4 `permissions`

One row per API endpoint. Seeded at deploy time — never created or modified via API.

```sql
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,  -- e.g. 'reports:create'
  method      VARCHAR(10) NOT NULL,          -- GET, POST, PATCH, DELETE
  path        VARCHAR(255) NOT NULL,         -- e.g. '/reports', '/reports/:id/lock-zone'
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (method, path)
);
```

**Seed data:**

| name                    | method | path                            |
|-------------------------|--------|---------------------------------|
| auth:login              | POST   | /auth/login                     |
| auth:refresh            | POST   | /auth/refresh                   |
| auth:logout             | POST   | /auth/logout                    |
| members:create          | POST   | /members                        |
| members:list            | GET    | /members                        |
| members:read            | GET    | /members/:id                    |
| members:roles_assign    | POST   | /members/:id/roles              |
| members:roles_revoke    | DELETE | /members/:id/roles/:role_name   |
| units:list              | GET    | /units                          |
| units:create            | POST   | /units                          |
| units:read              | GET    | /units/:id                      |
| units:update            | PATCH  | /units/:id                      |
| reports:new             | GET    | /reports/new                    |
| reports:create          | POST   | /reports                        |
| reports:list            | GET    | /reports                        |
| reports:read            | GET    | /reports/:id                    |
| reports:update          | PATCH  | /reports/:id                    |
| reports:lock_zone       | POST   | /reports/:id/lock-zone          |
| reports:finalize        | POST   | /reports/:id/finalize           |
| reports:export          | GET    | /reports/export                 |
| activities:list         | GET    | /activities                     |
| activities:create       | POST   | /activities                     |
| audit_logs:read         | GET    | /audit-logs                     |

---

### 2.5 `role_permissions` — Permission Assignments to Roles

```sql
CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (role_id, permission_id)
);
```

**Seed data — role → permission mapping:**

| Role            | Permissions granted                                                                                          |
|-----------------|--------------------------------------------------------------------------------------------------------------|
| UC_PRESIDENT    | members:create, members:list, members:read, units:list, units:read, reports:new, reports:create, reports:list, reports:read, reports:update, reports:export, activities:list |
| UC_SECRETARY    | members:list, members:read, units:list, units:read, reports:new, reports:create, reports:list, reports:read, reports:update, activities:list        |
| ZONE_PRESIDENT  | members:create, members:list, members:read, units:list, units:read, reports:new, reports:list, reports:read, reports:update, reports:lock_zone, reports:export, activities:list |
| ZONE_SECRETARY  | members:list, members:read, units:list, units:read, reports:new, reports:list, reports:read, reports:update, activities:list                       |
| ZILA_PRESIDENT  | All permissions                                                                                               |
| ZILA_SECRETARY  | units:list, units:read, members:list, members:read, reports:list, reports:read, reports:export, activities:list, audit_logs:read                   |

---

### 2.6 `member_roles` — Role Assignments to Members

```sql
CREATE TABLE member_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES members(id) ON DELETE SET NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,  -- NULL = currently active

  UNIQUE (member_id, role_id)
);
```

**Notes:**
- Roles are global — no `unit_id` binding. A `ZONE_PRESIDENT` role applies org-wide; access filtering by zone/UC is handled at the application layer using the member's own `uc_id` and the unit hierarchy.
- Only a Zila President can assign or revoke roles (enforced at app layer via `members:roles_assign` permission).
- Soft revocation: set `revoked_at` rather than deleting, for audit continuity.
- A member with no active roles has no access beyond authenticated endpoints (`auth:*`).

---

### 2.7 `monthly_reports`

```sql
CREATE TYPE report_status AS ENUM ('draft', 'zone_locked', 'finalized');

CREATE TABLE monthly_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id             UUID NOT NULL REFERENCES units(id),
  month               DATE NOT NULL,  -- always the 1st of the month (e.g. 2025-01-01)

  -- Leadership snapshot
  president_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  secretary_member_id UUID REFERENCES members(id) ON DELETE SET NULL,

  -- Status & locking
  status              report_status NOT NULL DEFAULT 'draft',
  locked_at           TIMESTAMP,
  finalized_at        TIMESTAMP,

  -- Timestamps
  created_by          UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (unit_id, month)
);

CREATE INDEX idx_monthly_reports_unit_month ON monthly_reports (unit_id, month);
```

**Notes:**
- `unit_id` references `units(id)` — the unit's `scope_level` (UC, Zone, Zila) determines what kind of report this is. No separate columns needed.
- The full hierarchy path (e.g. which Zone or Zila a UC belongs to) is resolved at query time by traversing `units.parent_id`. No denormalization needed.
- `month` is stored as the first day of the month for easy range queries.
- One report per unit per month enforced by the UNIQUE constraint.
- Youth Meeting is not a special field — it is an `activity_definition` with `compulsory_per_month = 1`, captured in `report_activities` like any other activity.

---

### 2.8 `activity_definitions`

Master list of activities (predefined). Members can also add custom ones per report.

```sql
CREATE TABLE activity_definitions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  scope_level          ENUM('UC', 'Zone', 'Zila') NOT NULL DEFAULT 'UC',
  compulsory_per_month INTEGER NOT NULL DEFAULT 0,  -- 0 = optional, ≥1 = required N times/month
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Seed data (examples):**

| name          | scope_level | compulsory_per_month |
|---------------|-------------|:--------------------:|
| Youth Meeting | UC          | 1                    |
| Study Circle  | UC          | 0                    |
| Sports Event  | UC          | 0                    |

A missing `report_activities` row for a compulsory definition is treated as "did not happen" — the application layer warns when submitting a report that has no entry for a compulsory activity.

---

### 2.9 `report_activities` — Occurred Activities per Report

```sql
CREATE TABLE report_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES monthly_reports(id) ON DELETE CASCADE,
  definition_id   UUID REFERENCES activity_definitions(id) ON DELETE SET NULL,
    -- NULL if custom/other activity
  name            VARCHAR(255) NOT NULL,   -- required even for predefined (copied for snapshot)
  occurrences     INTEGER NOT NULL DEFAULT 1 CHECK (occurrences >= 1),
  avg_attendance  INTEGER CHECK (avg_attendance >= 0),
  conductor       VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `definition_id = NULL` means a custom/other activity
- `name` is always stored explicitly (snapshot integrity)
- `total_attendance` is computed at read time as `occurrences * avg_attendance` — not stored

---

### 2.10 `report_field_values` — Submitted Field Values

Stores the submitted value for every dynamic form field in a report. Replaces the old untyped `report_meta_fields` key-value bag — every value here traces back to a governed `form_fields` row, and the field's `type` tells the application how to cast it.

```sql
CREATE TABLE report_field_values (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES monthly_reports(id) ON DELETE CASCADE,
  field_id   UUID NOT NULL REFERENCES form_fields(id) ON DELETE RESTRICT,
  value      TEXT,  -- NULL means field was left blank by the user
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (report_id, field_id)
);
```

**Notes:**
- A row is always inserted for every field that appears in the form for that unit's scope, including optional ones left blank (`value = NULL`). This makes it unambiguous whether a field was seen and skipped vs never presented.
- `value` is cast using `form_fields.type` when reading (`number` → `INTEGER`, `boolean` → `TRUE/FALSE`, `date` → `DATE`). A NULL value is returned as-is regardless of type.
- `ON DELETE RESTRICT` on `field_id` prevents deleting a `form_fields` row that has submitted data against it.
- Fields that are structural columns on `monthly_reports` (`president_member_id`, `secretary_member_id`, `status`, `unit_id`, `month`) are not stored here.
- Adding a new form field requires only a new `form_fields` seed row — no schema change.

---

### 2.11 `form_sections` — Report Form Sections

Groups of fields shown together on the report form. Scoped to one or more unit levels.

```sql
CREATE TABLE form_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL UNIQUE,  -- e.g. 'leadership', 'team_changes'
  label       VARCHAR(255) NOT NULL,         -- e.g. 'Leadership Info'
  scope_level ENUM('UC', 'Zone', 'Zila') NOT NULL,
  order_index INTEGER NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (scope_level, order_index)
);
```

**Seed data:**

| key              | label                  | scope_level | order_index |
|------------------|------------------------|-------------|:-----------:|
| leadership       | Leadership Info        | UC          | 1           |
| youth_meeting    | Monthly Youth Meeting  | UC          | 2           |
| team_changes     | Team Changes           | UC          | 3           |
| activities       | Activities             | UC          | 4           |
| zone_summary     | Zone Summary           | Zone        | 1           |
| zone_activities  | Zone Activities        | Zone        | 2           |
| zila_summary     | Zila Summary           | Zila        | 1           |

---

### 2.12 `form_fields` — Report Form Field Definitions

One row per logical field. Reusable across scope levels via `form_section_fields`.

```sql
CREATE TYPE form_field_type AS ENUM (
  'text',
  'number',
  'boolean',
  'date',
  'dropdown',
  'member_picker',
  'activity_list'
);

CREATE TABLE form_fields (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            VARCHAR(100) NOT NULL UNIQUE, -- maps to report_field_values via field_id, or a known column on monthly_reports
  label          VARCHAR(255) NOT NULL,
  type           form_field_type NOT NULL,
  is_required    BOOLEAN NOT NULL DEFAULT FALSE,
  prefill_source VARCHAR(100),
    -- e.g. 'last_report.secretary_member_id', 'unit.president_id', null = no prefill
  options        JSONB,
    -- for type='dropdown': [{"value": "male", "label": "Male"}, ...]
    -- for type='activity_list': null (driven by activity_definitions table)
    -- for all others: null
  validation     JSONB,
    -- e.g. {"min": 0, "max": 9999} for number fields
    -- e.g. {"min_length": 2} for text fields
  helper_text    VARCHAR(255),  -- shown below the field on the form
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Seed data:**

| key                  | label                   | type          | required | prefill_source                  |
|----------------------|-------------------------|---------------|:--------:|---------------------------------|
| president_member_id  | President (Sadar)       | member_picker | true     | `unit.president_id`             |
| secretary_member_id  | Secretary               | member_picker | true     | `last_report.secretary_member_id` |
| youth_meeting_held   | Was youth meeting held? | boolean       | true     | null                            |
| youth_meeting_date   | Meeting date            | date          | false    | null                            |
| rukan_count          | Rukan count             | number        | false    | null                            |
| umeedwar_count       | Umeedwar count          | number        | false    | null                            |
| youth_member_count   | Youth members           | number        | false    | null                            |
| activities           | Activities              | activity_list | false    | null                            |

---

### 2.13 `form_section_fields` — Fields Assigned to Sections

M:N join. A field can appear in sections across multiple scope levels.

```sql
CREATE TABLE form_section_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
  field_id    UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (section_id, field_id),
  UNIQUE (section_id, order_index)
);
```

**Seed data (UC scope):**

| section key      | field key             | order_index |
|------------------|-----------------------|:-----------:|
| leadership       | president_member_id   | 1           |
| leadership       | secretary_member_id   | 2           |
| youth_meeting    | youth_meeting_held    | 1           |
| youth_meeting    | youth_meeting_date    | 2           |
| team_changes     | rukan_count           | 1           |
| team_changes     | umeedwar_count        | 2           |
| team_changes     | youth_member_count    | 3           |
| activities       | activities            | 1           |

---

### 2.14 `audit_logs`

Append-only change history for all edits.

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,  -- e.g. 'monthly_report', 'member'
  entity_id   UUID NOT NULL,
  field_name  VARCHAR(100) NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  UUID REFERENCES members(id) ON DELETE SET NULL,
  changed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address  INET,
  user_agent  TEXT
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, changed_at DESC);
```

---

### 2.15 `refresh_tokens`

Stores issued refresh tokens for server-side invalidation on logout.

```sql
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the token
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,  -- set on logout; NULL = still valid
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Notes:**
- Store the hash, never the raw token
- On `POST /auth/logout`, set `revoked_at = NOW()` for the matching row
- On `POST /auth/refresh`, verify token hash exists, `revoked_at IS NULL`, and `expires_at > NOW()`
- Expired and revoked rows can be purged periodically
- Refresh token lifetime: 30 days. Access token lifetime: 24 hours (`expires_in: 86400`)

---

## 3. Permissions Model

### 3.1 How RBAC Works in This System

```
members  ──<  member_roles  >──  roles  ──<  role_permissions  >──  permissions
```

- **Permissions** are system-defined (seeded), one row per API endpoint. Never modified via API.
- **Roles** are seeded. Zila President can assign/revoke roles on members. No one can create new roles via API.
- **member_roles** links members to roles globally — no unit scoping on the join table.
- At runtime, the middleware checks: `does the requesting member have any active role that carries the required permission?`
- Data-level filtering (e.g. a Zone President only sees their own zone's reports) is enforced in the application/query layer, not in the permission system.

### 3.2 Middleware Check (Pseudocode)

```
function can(member, permission_name):
  active_role_ids = member_roles
    .where(member_id = member.id, revoked_at IS NULL)
    .pluck(role_id)

  return role_permissions
    .joins(:permission)
    .where(role_id IN active_role_ids, permissions.name = permission_name)
    .exists?
```

Every protected route declares its required permission name. The middleware resolves it before the handler runs.

### 3.3 Data Filtering Rules (App Layer)

Permission grants access to the endpoint. These rules govern what data is returned or mutated:

| Role            | Reports visible          | Members visible     | Units visible |
|-----------------|--------------------------|---------------------|---------------|
| UC_PRESIDENT    | Own UC only              | Own UC only         | Own UC + parents |
| UC_SECRETARY    | Own UC only              | Own UC only         | Own UC + parents |
| ZONE_PRESIDENT  | All UCs in own zone      | All in own zone     | Own zone + children + parents |
| ZONE_SECRETARY  | All UCs in own zone      | All in own zone     | Own zone + children + parents |
| ZILA_PRESIDENT  | All                      | All                 | All |
| ZILA_SECRETARY  | All (read-only)          | All (read-only)     | All |

"Own zone" is derived from the member's `uc_id` → parent Zone → parent Zila at query time.

### 3.4 Edit Rules by Report Status

| Status        | UC roles can edit | Zone roles can edit | Zila President can edit |
|---------------|:-----------------:|:-------------------:|:-----------------------:|
| `draft`       | ✓                 | ✓                   | ✓                       |
| `zone_locked` | ✗                 | ✗                   | ✓                       |
| `finalized`   | ✗                 | ✗                   | ✗                       |

### 3.5 Locking Rules

```
UC creates report         →  status: draft
Zone President locks      →  all UC reports in zone → status: zone_locked
Zila President finalizes  →  all reports in zila   → status: finalized
```

---

## 4. API Specification

All endpoints are prefixed with `/api/v1`.

### 4.1 Authentication

#### `POST /auth/login` — Email + Password

**Request:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expires_in": 86400,
  "member": {
    "id": "a1b2c3d4-...",
    "name": "John Doe",
    "email": "john@example.com",
    "uc_id": "uc-uuid-here",
    "roles": ["ZONE_PRESIDENT", "UC_PRESIDENT"],
    "permissions": [
      "members:create",
      "members:list",
      "members:read",
      "reports:create",
      "reports:list",
      "reports:read",
      "reports:update",
      "reports:lock_zone",
      "reports:export",
      "activities:list",
      "units:list",
      "units:read"
    ]
  }
}
```

**Response 401:**
```json
{
  "error": "invalid_credentials",
  "message": "Email or password is incorrect."
}
```

---

#### `POST /auth/refresh` — Refresh Access Token

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**Response 401:**
```json
{
  "error": "invalid_refresh_token",
  "message": "Refresh token is invalid or expired."
}
```

---

#### `POST /auth/logout` — Logout

Invalidates the refresh token server-side. The access token expires naturally after `expires_in`.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response 200:**
```json
{
  "message": "Logged out successfully."
}
```

---

### 4.2 Units

#### `GET /units` — List Units

**Query params:** `?scope_level=UC&parent_id=zone-uuid`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uc-uuid-1",
      "name": "Halqa Model Town",
      "scope_level": "UC",
      "parent_id": "zone-uuid-1",
      "president": {
        "id": "member-uuid",
        "name": "John Doe"
      }
    },
    {
      "id": "uc-uuid-2",
      "name": "Halqa Gulberg",
      "scope_level": "UC",
      "parent_id": "zone-uuid-1",
      "president": null
    }
  ],
  "meta": {
    "total": 2
  }
}
```

---

#### `POST /units` — Create Unit (Zila President only)

**Request:**
```json
{
  "name": "Halqa Johar Town",
  "scope_level": "UC",
  "parent_id": "zone-uuid-1"
}
```

**Response 201:**
```json
{
  "id": "new-uc-uuid",
  "name": "Halqa Johar Town",
  "scope_level": "UC",
  "parent_id": "zone-uuid-1",
  "president_id": null,
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

#### `GET /units/{id}` — Get Single Unit

**Response 200:**
```json
{
  "id": "uc-uuid-1",
  "name": "Halqa Model Town",
  "scope_level": "UC",
  "parent_id": "zone-uuid-1",
  "president": {
    "id": "member-uuid-1",
    "name": "Ali Raza"
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

#### `PATCH /units/{id}` — Update Unit (Zila President only)

All fields optional — only include what is changing.

**Request:**
```json
{
  "name": "Halqa Model Town (Revised)",
  "parent_id": "zone-uuid-2",
  "president_id": "member-uuid-5"
}
```

**Rules:**
- `president_id` must reference an active member (`is_active = true`)
- `parent_id` change is allowed but the new parent must be the correct scope level (Zone for UC, Zila for Zone)
- Scope level itself (`scope_level`) cannot be changed after creation

**Response 200:**
```json
{
  "id": "uc-uuid-1",
  "name": "Halqa Model Town (Revised)",
  "scope_level": "UC",
  "parent_id": "zone-uuid-2",
  "president": {
    "id": "member-uuid-5",
    "name": "Hassan Ali"
  },
  "updated_at": "2025-03-10T11:00:00Z"
}
```

**Response 422:**
```json
{
  "error": "invalid_parent",
  "message": "A UC must have a Zone as its parent."
}
```

---

### 4.3 Members

#### `POST /members` — Create Member

**Request:**
```json
{
  "name": "Ali Raza",
  "email": "ali@example.com",
  "phone": "+923009876543",
  "password": "securePass!1",
  "uc_id": "uc-uuid-1"
}
```

**Response 201:**
```json
{
  "id": "new-member-uuid",
  "name": "Ali Raza",
  "email": "ali@example.com",
  "phone": "+923009876543",
  "uc_id": "uc-uuid-1",
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Response 409:**
```json
{
  "error": "duplicate_contact",
  "message": "A member with this email already exists."
}
```

---

#### `GET /members` — List Members

**Query params:** `?uc_id=uc-uuid&role=UC_PRESIDENT&page=1&per_page=20`

**Response 200:**
```json
{
  "data": [
    {
      "id": "member-uuid-1",
      "name": "Ali Raza",
      "email": "ali@example.com",
      "phone": "+923009876543",
      "uc": {
        "id": "uc-uuid-1",
        "name": "Halqa Model Town"
      },
      "roles": [
        "UC_PRESIDENT"
      ]
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}
```

---

#### `GET /members/{id}` — Get Single Member

**Request:**
```json
{
  "role_name": "UC_SECRETARY"
}
```

**Response 200:**
```json
{
  "member_id": "member-uuid-1",
  "role": "UC_SECRETARY",
  "granted_by": "zila-president-member-uuid",
  "granted_at": "2025-01-15T10:00:00Z"
}
```

**Response 403:**
```json
{
  "error": "forbidden",
  "message": "Only a Zila President can assign roles."
}
```

---

#### `DELETE /members/{id}/roles/{role_name}` — Revoke Role (Zila President only)

Sets `revoked_at` on the `member_roles` row — does not delete the row.

**Response 200:**
```json
{
  "member_id": "member-uuid-1",
  "role": "UC_SECRETARY",
  "revoked_by": "zila-president-member-uuid",
  "revoked_at": "2025-03-01T09:00:00Z"
}
```

**Response 404:**
```json
{
  "error": "not_found",
  "message": "This member does not have the role UC_SECRETARY."
}
```

**Response 403:**
```json
{
  "error": "forbidden",
  "message": "Only a Zila President can revoke roles."
}
```

---

### 4.4 Reports

#### `GET /reports/new` — Form Schema with Prefill

Returns the complete form structure for a given unit — sections, fields, types, and prefilled values. Always targets the **previous calendar month** (e.g. if today is March, returns form for February). No validation is performed here — validation happens on `POST /reports` submission.

**Query params:** `?unit_id=uc-uuid-1`

**Response 200:**
```json
{
  "unit": {
    "id": "uc-uuid-1",
    "name": "Halqa Model Town",
    "scope_level": "UC"
  },
  "month": "2025-03-01",
  "sections": [
    {
      "key": "leadership",
      "label": "Leadership Info",
      "order_index": 1,
      "fields": [
        {
          "key": "president_member_id",
          "label": "President (Sadar)",
          "type": "member_picker",
          "is_required": true,
          "prefill_value": {
            "id": "member-uuid-1",
            "name": "Ali Raza"
          },
          "options": null,
          "validation": null,
          "helper_text": null
        },
        {
          "key": "secretary_member_id",
          "label": "Secretary",
          "type": "member_picker",
          "is_required": true,
          "prefill_value": {
            "id": "member-uuid-2",
            "name": "Sara Khan"
          },
          "options": null,
          "validation": null,
          "helper_text": "Prefilled from last month's report. Change if needed."
        }
      ]
    },
    {
      "key": "youth_meeting",
      "label": "Monthly Youth Meeting",
      "order_index": 2,
      "fields": [
        {
          "key": "youth_meeting_held",
          "label": "Was youth meeting held?",
          "type": "boolean",
          "is_required": true,
          "prefill_value": null,
          "options": null,
          "validation": null,
          "helper_text": null
        },
        {
          "key": "youth_meeting_date",
          "label": "Meeting date",
          "type": "date",
          "is_required": false,
          "prefill_value": null,
          "options": null,
          "validation": null,
          "helper_text": "Required if meeting was held."
        }
      ]
    },
    {
      "key": "team_changes",
      "label": "Team Changes",
      "order_index": 3,
      "fields": [
        {
          "key": "rukan_count",
          "label": "Rukan count",
          "type": "number",
          "is_required": false,
          "prefill_value": null,
          "options": null,
          "validation": { "min": 0 },
          "helper_text": null
        },
        {
          "key": "umeedwar_count",
          "label": "Umeedwar count",
          "type": "number",
          "is_required": false,
          "prefill_value": null,
          "options": null,
          "validation": { "min": 0 },
          "helper_text": null
        },
        {
          "key": "youth_member_count",
          "label": "Youth members",
          "type": "number",
          "is_required": false,
          "prefill_value": null,
          "options": null,
          "validation": { "min": 0 },
          "helper_text": null
        }
      ]
    },
    {
      "key": "activities",
      "label": "Activities",
      "order_index": 4,
      "fields": [
        {
          "key": "activities",
          "label": "Activities",
          "type": "activity_list",
          "is_required": false,
          "prefill_value": null,
          "options": {
            "definitions": [
              {
                "id": "act-def-youth-meeting",
                "name": "Youth Meeting",
                "compulsory_per_month": 1
              },
              {
                "id": "act-def-study-circle",
                "name": "Study Circle",
                "compulsory_per_month": 0
              }
            ],
            "allow_custom": true
          },
          "validation": null,
          "helper_text": "Add all activities conducted this month. Compulsory activities are marked."
        }
      ]
    }
  ]
}
```

**Prefill resolution logic (server-side):**

| `prefill_source`                    | Resolved from                                          |
|-------------------------------------|--------------------------------------------------------|
| `unit.president_id`                 | `units.president_id` for the given `unit_id`           |
| `last_report.secretary_member_id`   | Most recent report for same unit, previous month       |
| `null`                              | `prefill_value` returned as `null` — field starts empty |

**Error — unit not found:**
```json
{
  "error": "unit_not_found",
  "message": "No unit found with the given unit_id."
}
```

---

#### `POST /reports` — Create Report

**Request:**
```json
{
  "unit_id": "uc-uuid-1",
  "month": "2025-02-01",
  "president_member_id": "member-uuid-1",
  "secretary_member_id": "member-uuid-2",
  "activities": [
    {
      "definition_id": "act-def-youth-meeting",
      "name": "Youth Meeting",
      "occurrences": 2,
      "avg_attendance": 40,
      "conductor": "Ali Raza"
    },
    {
      "definition_id": "act-def-study-circle",
      "name": "Study Circle",
      "occurrences": 3,
      "avg_attendance": 25,
      "conductor": null
    },
    {
      "definition_id": null,
      "name": "Special Camp",
      "occurrences": 1,
      "avg_attendance": 60,
      "conductor": null
    }
  ],
  "field_values": [
    { "field_id": "field-uuid-rukan",        "value": "12" },
    { "field_id": "field-uuid-umeedwar",     "value": "5"  },
    { "field_id": "field-uuid-youth-member", "value": "30" }
  ]
}
```

**Response 201:**
```json
{
  "id": "report-uuid-1",
  "unit_id": "uc-uuid-1",
  "month": "2025-02-01",
  "status": "draft",
  "president_member_id": "member-uuid-1",
  "secretary_member_id": "member-uuid-2",
  "activities": [
    {
      "id": "act-occ-1",
      "definition_id": "act-def-youth-meeting",
      "name": "Youth Meeting",
      "occurrences": 2,
      "avg_attendance": 40,
      "conductor": "Ali Raza"
    },
    {
      "id": "act-occ-2",
      "definition_id": "act-def-study-circle",
      "name": "Study Circle",
      "occurrences": 3,
      "avg_attendance": 25,
      "conductor": null
    },
    {
      "id": "act-occ-3",
      "definition_id": null,
      "name": "Special Camp",
      "occurrences": 1,
      "avg_attendance": 60,
      "conductor": null
    }
  ],
  "field_values": [
    { "field_id": "field-uuid-rukan",        "field_key": "rukan_count",        "value": "12" },
    { "field_id": "field-uuid-umeedwar",     "field_key": "umeedwar_count",     "value": "5"  },
    { "field_id": "field-uuid-youth-member", "field_key": "youth_member_count", "value": "30" }
  ],
  "created_at": "2025-02-05T09:00:00Z",
  "updated_at": "2025-02-05T09:00:00Z"
}
```

**Response 409:**
```json
{
  "error": "report_exists",
  "message": "A report for this UC and month already exists.",
  "existing_report_id": "report-uuid-existing"
}
```

---

#### `GET /reports/{id}` — Get Report

**Response 200:** Same structure as the create response, with the full `unit` object expanded:

```json
{
  "id": "report-uuid-1",
  "status": "draft",
  "unit": {
    "id": "uc-uuid-1",
    "name": "Halqa Model Town",
    "scope_level": "UC",
    "parent_id": "zone-uuid-1"
  },
  "month": "2025-02-01",
  "president_member_id": "member-uuid-1",
  "secretary_member_id": "member-uuid-2",
  "activities": [ ... ],
  "field_values": [
    { "field_id": "field-uuid-rukan",        "field_key": "rukan_count",        "value": "12" },
    { "field_id": "field-uuid-youth-member", "field_key": "youth_member_count", "value": "30" }
  ],
  "created_at": "2025-02-05T09:00:00Z",
  "updated_at": "2025-02-05T09:00:00Z",
  "locked_at": null,
  "finalized_at": null
}
```

The full ancestor chain (Zone, Zila) can be resolved client-side or via a separate `GET /units/:id` call using `parent_id`. If the frontend needs the full path in one shot, add `?include=ancestors` to expand it:

```json
"unit": {
  "id": "uc-uuid-1",
  "name": "Halqa Model Town",
  "scope_level": "UC",
  "parent_id": "zone-uuid-1",
  "ancestors": [
    { "id": "zone-uuid-1", "name": "Zone A", "scope_level": "Zone" },
    { "id": "zila-uuid-1", "name": "Lahore", "scope_level": "Zila" }
  ]
}
```

---

#### `PATCH /reports/{id}` — Edit Report (partial update)

Only allowed when `status = 'draft'` for UC/Zone roles. Zila President can edit up to `zone_locked`. All fields are optional — only include what is changing.

**Request:**
```json
{
  "president_member_id": "member-uuid-new",
  "secretary_member_id": "member-uuid-2",
  "field_values": [
    { "field_id": "field-uuid-rukan", "value": "14" }
  ],
  "activities": {
    "add": [
      {
        "definition_id": null,
        "name": "Special Camp",
        "occurrences": 1,
        "avg_attendance": 60,
        "conductor": null
      }
    ],
    "update": [
      {
        "id": "act-occ-1",
        "occurrences": 3,
        "avg_attendance": 45
      }
    ],
    "remove": ["act-occ-2"]
  }
}
```

**Rules:**
- `president_member_id` and `secretary_member_id` are patched directly on `monthly_reports`
- `field_values` uses upsert semantics: if a row for `(report_id, field_id)` exists it is updated; otherwise inserted
- `activities.add` inserts new `report_activities` rows
- `activities.update` patches existing rows by their `id`
- `activities.remove` deletes rows by their `id` — only allowed while `status = 'draft'`
- Any combination of the above keys is valid; omitted keys are untouched

**Response 200:** Full updated report object (same shape as `GET /reports/:id`).

**Response 403:**
```json
{
  "error": "report_locked",
  "message": "This report has been locked and cannot be edited."
}
```

**Response 422:**
```json
{
  "error": "invalid_field",
  "message": "Unknown field_id: field-uuid-unknown."
}
```

---

#### `POST /reports/{id}/lock-zone` — Zone President Locks UC Reports

Calling this on a report triggers locking of all UC reports in the zone for that month.

**Request:** (no body required)

**Response 200:**
```json
{
  "locked_report_ids": ["report-uuid-1", "report-uuid-2", "report-uuid-3"],
  "locked_at": "2025-02-10T12:00:00Z",
  "locked_by": "zone-president-member-id"
}
```

**Response 400:**
```json
{
  "error": "missing_reports",
  "message": "3 UCs have not submitted reports yet.",
  "missing_unit_ids": ["uc-uuid-5", "uc-uuid-7", "uc-uuid-9"]
}
```

---

#### `POST /reports/{id}/finalize` — Zila President Finalizes

**Request:** (no body required)

**Response 200:**
```json
{
  "finalized_report_ids": ["report-uuid-1", "report-uuid-2"],
  "finalized_at": "2025-02-15T09:00:00Z",
  "finalized_by": "zila-president-member-id"
}
```

---

#### `GET /reports` — List Reports

**Query params:** `?unit_id=zone-uuid&status=draft&page=1&per_page=20`

**Response 200:**
```json
{
  "data": [
    {
      "id": "report-uuid-1",
      "unit_id": "uc-uuid-1",
      "unit_name": "Halqa Model Town",
      "unit_scope": "UC",
      "month": "2025-02-01",
      "status": "draft",
      "president": "Ali Raza",
      "created_at": "2025-02-05T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 12
  }
}
```

---

### 4.5 Activities

#### `GET /activities` — List Activity Definitions

**Query params:** `?scope_level=UC&is_active=true`

**Response 200:**
```json
{
  "data": [
    {
      "id": "act-def-1",
      "name": "Youth Meeting",
      "scope_level": "UC",
      "compulsory_per_month": 1,
      "is_active": true
    },
    {
      "id": "act-def-2",
      "name": "Study Circle",
      "scope_level": "UC",
      "compulsory_per_month": 0,
      "is_active": true
    }
  ]
}
```

---

#### `POST /activities` — Create Activity Definition (admin only)

**Request:**
```json
{
  "name": "Sports Tournament",
  "scope_level": "Zone",
  "compulsory_per_month": 0
}
```

**Response 201:**
```json
{
  "id": "act-def-new",
  "name": "Sports Tournament",
  "scope_level": "Zone",
  "compulsory_per_month": 0,
  "is_active": true,
  "created_at": "2025-01-10T08:00:00Z"
}
```

---

### 4.6 Export

#### `GET /reports/export` — Excel Export

**Query params:** `?unit_id=zone-uuid-1&month=2025-02`

The export scope is inferred from `units.scope_level` of the given `unit_id`:
- UC → single UC sheet
- Zone → all UC sheets in that zone + zone summary sheet
- Zila → all UC sheets + all zone summaries + zila summary sheet

**Response 200:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="report_lahore_2025-02.xlsx"
```

Binary file stream.

**Response 404:**
```json
{
  "error": "not_found",
  "message": "No finalized report found for this unit and month."
}
```

---

### 4.7 Audit Logs

#### `GET /audit-logs` — Fetch Audit Trail

**Query params:** `?entity_type=monthly_report&entity_id=report-uuid-1`

**Response 200:**
```json
{
  "data": [
    {
      "id": "log-uuid-1",
      "entity_type": "monthly_report",
      "entity_id": "report-uuid-1",
      "field_name": "rukan_count",
      "old_value": "12",
      "new_value": "14",
      "changed_by": {
        "id": "member-uuid-1",
        "name": "Ali Raza"
      },
      "changed_at": "2025-02-07T14:23:00Z"
    }
  ]
}
```

---

## 5. Workflow State Transitions

```
[UC creates report]
        │
        ▼
    ┌────────┐
    │ draft  │  ← UC can edit, Zone can edit
    └────────┘
        │
        │ Zone President calls POST /reports/{id}/lock-zone
        ▼
┌──────────────┐
│ zone_locked  │  ← Only Zila can edit
└──────────────┘
        │
        │ Zila President calls POST /reports/{id}/finalize
        ▼
┌────────────┐
│ finalized  │  ← No edits allowed (read-only forever)
└────────────┘
```

**Rollback policy:** No automatic rollback. Zila President can manually re-open a finalized report by setting status back to `zone_locked` (admin-level operation, fully audited).

---

## 6. Edge Cases & Handling

| Scenario | Handling |
|---|---|
| UC has no president | Report can still be created; `president_member_id` is nullable. Warning returned in response. |
| Zone locked but UC report missing | `lock-zone` endpoint returns 400 with list of missing unit IDs. Operator must decide. |
| Member changes UC | Update `uc_id` in members. Historical reports are unaffected — `unit_id` on the report pointed to the unit at submission time. |
| Duplicate activity name | Allowed if `definition_id` differs (predefined vs custom). Warn at app layer. |
| Invalid refresh token | `POST /auth/refresh` returns 401 `invalid_refresh_token`. Client must redirect to login. |
| Edit after zone lock | 403 `report_locked` for UC/Zone users. Zila President can still edit. |
| Role conflict (same person, two roles) | Allowed. Permissions are additive — member gets the union of all permissions across their active roles. |
| UC moved to different Zone | Update `units.parent_id`. Historical reports are unaffected — hierarchy is resolved at query time; reports only store `unit_id`. |
| Unknown field_id in submission | 422 returned with the offending `field_id`. No partial saves. |

---

## 7. Key Design Decisions (Finalized)

| Decision | Choice | Rationale |
|---|---|---|
| Hierarchy table | Unified `units` with `parent_id` | Avoids 3 separate join tables, scales to N levels |
| Auth | Email + Password only; JWT access token (24h) + refresh token (30d) | Simple, no SMS dependency |
| Report uniqueness | `UNIQUE(unit_id, month)` | One report per unit per month, any scope level |
| Activity model | Hybrid: predefined definition + custom name | Flexibility without losing structure |
| Form schema | `form_sections` + `form_fields` + `form_section_fields` | FE renders from DB config, no hardcoding |
| Field values | `report_field_values` with FK to `form_fields` | Type-safe, governed, queryable — replaces untyped key-value bag |
| Audit | Append-only `audit_logs` table | Never mutate history |
| Locking | Status enum progression (`draft` → `zone_locked` → `finalized`) | Simple, clear, hard to accidentally reverse |
| Permissions | Global roles + `role_permissions` join to per-endpoint permissions | Clean RBAC, no unit scoping on roles |
| Export | On-demand XLSX, scope inferred from `unit_id` | No scheduled jobs needed initially |
| `total_attendance` | Computed at read time (`occurrences × avg_attendance`) | Never stored — no sync bugs, no NULL edge cases |

---

## 8. Missing / Open Items (Discuss Before Dev)

1. **Nazam (calculated field):** Spec says it's computed from "active members + assigned leadership." Need a precise definition — what threshold makes a UC count as "organized"?

2. **Zila Halqa Programs:** Spec says "entered only at Zila level, linked to UC reports." Clarify fields — likely a new `form_section` + `form_fields` seeded for Zila scope, values stored in `report_field_values`.

3. **Approval notifications:** Listed as future phase but API hooks should be stubbed now.

4. **Pagination defaults:** Default `per_page = 20`, maximum `per_page = 100`. Enforce in all list endpoints.

5. **Excel column definitions:** Define exact column order and labels for each sheet in the export.