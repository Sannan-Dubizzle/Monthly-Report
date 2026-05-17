# Monthly Reporting System — API Reference

## Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Request & Response Conventions](#request--response-conventions)
- [Error Format](#error-format)
- [Permissions & Access Control](#permissions--access-control)
- [Endpoints](#endpoints)
    - [Auth](#auth)
    - [Units](#units)
    - [Members](#members)
    - [Reports](#reports)
    - [Activities](#activities)
    - [Export](#export)
    - [Audit Logs](#audit-logs)

---

## Overview

**Base URL:** `https://<host>/api/v1`

All requests and responses use `application/json` unless stated otherwise (export endpoint returns binary).

---

## Authentication

All endpoints except `POST /auth/login` require a valid access token sent as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

**Token lifetimes:**
- Access token: **24 hours** (`expires_in: 86400`)
- Refresh token: **30 days**

When an access token expires, use `POST /auth/refresh` with the refresh token to get a new one. If the refresh token is also expired or revoked, redirect the user to login.

---

## Request & Response Conventions

- All IDs are **UUIDs**
- All timestamps are **ISO 8601** (`2025-02-05T09:00:00Z`)
- Dates (month fields) are always the **first of the month** (`2025-02-01`)
- `PATCH` requests are **partial** — only include fields you want to change; omitted fields are untouched
- List endpoints return a `data` array and a `meta` object
- Pagination defaults: `per_page=20`, maximum `per_page=100`
- `scope_level` values are always one of: `"UC"`, `"Zone"`, `"Zila"`
- Report `status` values: `"draft"`, `"zone_locked"`, `"finalized"`
- Field `type` values: `"text"`, `"number"`, `"boolean"`, `"date"`, `"dropdown"`, `"member_picker"`, `"activity_list"`

---

## Error Format

All error responses follow this shape:

```json
{
  "error": "error_code",
  "message": "Human-readable description."
}
```

Some errors include additional fields (e.g. `existing_report_id`, `missing_unit_ids`). These are documented per endpoint.

**Common HTTP status codes:**

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad request (e.g. business rule violation) |
| 401  | Unauthenticated |
| 403  | Forbidden (authenticated but not permitted) |
| 404  | Not found |
| 409  | Conflict (duplicate) |
| 422  | Validation error |

---

## Permissions & Access Control

On login, the API returns a flat `permissions` array listing every action the authenticated member can perform. Use this to show/hide UI elements — the API will also enforce these server-side.

**Data visibility** is scoped automatically based on the member's unit:
- UC roles see only their own UC's data
- Zone roles see all UCs within their zone
- Zila roles see everything

**Report edit rules by status:**

| Status        | UC roles | Zone roles | Zila President |
|---------------|:--------:|:----------:|:--------------:|
| `draft`       | ✓        | ✓          | ✓              |
| `zone_locked` | ✗        | ✗          | ✓              |
| `finalized`   | ✗        | ✗          | ✗              |

---

## Endpoints

---

## Auth

### `POST /auth/login`

Authenticate with email and password.

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

### `POST /auth/refresh`

Exchange a refresh token for a new access token.

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

### `POST /auth/logout`

Invalidates the refresh token server-side. The access token expires naturally — discard it client-side on logout.

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

## Units

Units represent the organizational hierarchy: Zila → Zone → UC. The `scope_level` field identifies the tier, and `parent_id` links to the parent unit.

### `GET /units`

List units. Filtered by the authenticated member's scope — a UC President sees only their unit and its ancestors; a Zone President sees their zone and all UCs beneath it; a Zila President sees all.

**Query params:**

| Param        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| `scope_level`| string | No       | Filter by level: `UC`, `Zone`, or `Zila` |
| `parent_id`  | UUID   | No       | Filter by parent unit                    |

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
        "id": "member-uuid-1",
        "name": "Ali Raza"
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

### `POST /units`

Create a new unit. Zila President only.

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
  "president": null,
  "created_at": "2025-01-15T10:00:00Z"
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

### `GET /units/{id}`

Get a single unit by ID.

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

**Response 404:**
```json
{
  "error": "not_found",
  "message": "Unit not found."
}
```

To get the full ancestor chain (e.g. for a breadcrumb), append `?include=ancestors`:

```json
{
  "id": "uc-uuid-1",
  "name": "Halqa Model Town",
  "scope_level": "UC",
  "parent_id": "zone-uuid-1",
  "president": { "id": "member-uuid-1", "name": "Ali Raza" },
  "ancestors": [
    { "id": "zone-uuid-1", "name": "Zone A",  "scope_level": "Zone" },
    { "id": "zila-uuid-1", "name": "Lahore",  "scope_level": "Zila" }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

### `PATCH /units/{id}`

Update a unit. Zila President only. All fields are optional.

**Request:**
```json
{
  "name": "Halqa Model Town (Revised)",
  "parent_id": "zone-uuid-2",
  "president_id": "member-uuid-5"
}
```

| Field          | Notes                                                               |
|----------------|---------------------------------------------------------------------|
| `name`         | New display name                                                    |
| `parent_id`    | Must be correct scope for this unit type (Zone for UC, Zila for Zone). `scope_level` itself cannot be changed |
| `president_id` | Must reference an active member (`is_active = true`)                |

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

## Members

### `POST /members`

Create a new member. UC Presidents and above.

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

| Field      | Type   | Required | Notes                            |
|------------|--------|----------|----------------------------------|
| `name`     | string | Yes      |                                  |
| `email`    | string | Yes      | Used for login. Must be unique.  |
| `phone`    | string | No       | Contact info only                |
| `password` | string | Yes      |                                  |
| `uc_id`    | UUID   | Yes      | Must reference a UC-level unit   |

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

### `GET /members`

List members. Results are scoped to the authenticated member's visibility.

**Query params:**

| Param      | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| `uc_id`    | UUID   | No       | Filter by UC                         |
| `role`     | string | No       | Filter by role name e.g. `UC_PRESIDENT` |
| `page`     | int    | No       | Default: 1                           |
| `per_page` | int    | No       | Default: 20, max: 100                |

**Response 200:**
```json
{
  "data": [
    {
      "id": "member-uuid-1",
      "name": "Ali Raza",
      "email": "ali@example.com",
      "phone": "+923009876543",
      "is_active": true,
      "uc": {
        "id": "uc-uuid-1",
        "name": "Halqa Model Town"
      },
      "roles": ["UC_PRESIDENT"]
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

### `GET /members/{id}`

Get a single member's full profile.

**Response 200:**
```json
{
  "id": "member-uuid-1",
  "name": "Ali Raza",
  "email": "ali@example.com",
  "phone": "+923009876543",
  "is_active": true,
  "uc": {
    "id": "uc-uuid-1",
    "name": "Halqa Model Town",
    "scope_level": "UC"
  },
  "roles": ["UC_PRESIDENT"],
  "created_at": "2025-01-10T08:00:00Z",
  "updated_at": "2025-01-10T08:00:00Z"
}
```

**Response 404:**
```json
{
  "error": "not_found",
  "message": "Member not found."
}
```

---

### `POST /members/{id}/roles`

Assign a role to a member. Zila President only.

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

### `DELETE /members/{id}/roles/{role_name}`

Revoke a role from a member. Zila President only. The role assignment is soft-deleted (not removed from the database).

**No request body required.**

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

## Reports

### Report object shape

The full report object (returned by `GET /reports/{id}`, `POST /reports`, and `PATCH /reports/{id}`) looks like:

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
  "activities": [
    {
      "id": "act-occ-1",
      "definition_id": "act-def-youth-meeting",
      "name": "Youth Meeting",
      "occurrences": 2,
      "avg_attendance": 40,
      "conductor": "Ali Raza",
      "notes": null
    }
  ],
  "field_values": [
    { "field_id": "field-uuid-rukan", "field_key": "rukan_count", "value": "12" },
    { "field_id": "field-uuid-umeedwar", "field_key": "umeedwar_count", "value": null }
  ],
  "created_at": "2025-02-05T09:00:00Z",
  "updated_at": "2025-02-05T09:00:00Z",
  "locked_at": null,
  "finalized_at": null
}
```

**Notes:**
- `field_values[].value` is always a string or `null`. Cast using `field_key` context or the form schema field type.
- `activities[].definition_id` is `null` for custom activities not on the predefined list.
- `total_attendance` for an activity is computed as `occurrences × avg_attendance` — not stored, calculate it client-side.

---

### `GET /reports/new`

Returns the form schema and prefilled values for creating a new report. Always targets the **previous calendar month** — no month parameter needed. Validation is not performed here; it happens on `POST /reports`.

**Query params:**

| Param     | Type | Required | Description           |
|-----------|------|----------|-----------------------|
| `unit_id` | UUID | Yes      | The unit to create a report for |

**Response 200:**
```json
{
  "unit": {
    "id": "uc-uuid-1",
    "name": "Halqa Model Town",
    "scope_level": "UC"
  },
  "month": "2025-02-01",
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

**Field types and how to render them:**

| `type`          | Render as                                     | `options` used? |
|-----------------|-----------------------------------------------|:---------------:|
| `text`          | Text input                                    | No              |
| `number`        | Number input; apply `validation.min`/`max`    | No              |
| `boolean`       | Toggle / yes-no switch                        | No              |
| `date`          | Date picker                                   | No              |
| `dropdown`      | Select; items from `options` array            | Yes             |
| `member_picker` | Searchable member select; use `GET /members`  | No              |
| `activity_list` | Repeatable activity rows; see below           | Yes             |

**Rendering `activity_list`:** Render one row per entry in `options.definitions`. Each row needs: activity name (pre-filled, read-only for predefined; editable for custom), occurrences (number), avg_attendance (number). If `allow_custom: true`, show an "Add custom activity" button that appends a blank row with an editable name and `definition_id: null`. Activities with `compulsory_per_month ≥ 1` should be visually marked as required.

**Response 404:**
```json
{
  "error": "unit_not_found",
  "message": "No unit found with the given unit_id."
}
```

---

### `POST /reports`

Submit a new report. The `field_values` array must include a row for every field shown in the form — pass `value: null` for optional fields left blank.

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
    { "field_id": "field-uuid-youth-member", "value": null }
  ]
}
```

| Field                  | Type    | Required | Notes |
|------------------------|---------|----------|-------|
| `unit_id`              | UUID    | Yes      | |
| `month`                | date    | Yes      | First of the month |
| `president_member_id`  | UUID    | No       | Nullable |
| `secretary_member_id`  | UUID    | No       | Nullable |
| `activities`           | array   | No       | Can be empty |
| `activities[].definition_id` | UUID | No  | `null` for custom activities |
| `activities[].name`    | string  | Yes      | Required even for predefined |
| `activities[].occurrences` | int | Yes     | Min 1 |
| `activities[].avg_attendance` | int | No  | |
| `activities[].conductor` | string | No    | |
| `field_values`         | array   | Yes      | One entry per form field |
| `field_values[].field_id` | UUID | Yes     | From form schema |
| `field_values[].value` | string  | No       | `null` for blank optional fields |

**Response 201:** Full report object (see [Report object shape](#report-object-shape)).

**Response 409:**
```json
{
  "error": "report_exists",
  "message": "A report for this unit and month already exists.",
  "existing_report_id": "report-uuid-existing"
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

### `GET /reports`

List reports. Scoped to the authenticated member's visibility.

**Query params:**

| Param      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `unit_id`  | UUID   | No       | Pass any unit ID — returns reports for that unit and all units beneath it |
| `month`    | date   | No       | e.g. `2025-02` or `2025-02-01` |
| `status`   | string | No       | `draft`, `zone_locked`, or `finalized` |
| `page`     | int    | No       | Default: 1 |
| `per_page` | int    | No       | Default: 20, max: 100 |

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

### `GET /reports/{id}`

Get a full report by ID.

**Response 200:** Full report object (see [Report object shape](#report-object-shape)).

Append `?include=ancestors` to expand the unit's full ancestor chain inside the `unit` object.

---

### `PATCH /reports/{id}`

Partially update a report. All top-level keys are optional — only send what is changing.

Allowed while `status = 'draft'` for UC and Zone roles. Zila President can edit up to `zone_locked`.

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

| Key                   | Behaviour |
|-----------------------|-----------|
| `president_member_id` | Replaces value on the report |
| `secretary_member_id` | Replaces value on the report |
| `field_values`        | Upsert — updates existing row if present, inserts if not |
| `activities.add`      | Inserts new activity rows |
| `activities.update`   | Patches existing activity rows by `id` |
| `activities.remove`   | Deletes activity rows by `id` (draft only) |

**Response 200:** Full updated report object.

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

### `POST /reports/{id}/lock-zone`

Zone President locks all UC reports in their zone for the same month. No request body.

**Response 200:**
```json
{
  "locked_report_ids": ["report-uuid-1", "report-uuid-2", "report-uuid-3"],
  "locked_at": "2025-02-10T12:00:00Z",
  "locked_by": "zone-president-member-id"
}
```

**Response 400** — some UCs have not submitted yet:
```json
{
  "error": "missing_reports",
  "message": "3 UCs have not submitted reports yet.",
  "missing_unit_ids": ["uc-uuid-5", "uc-uuid-7", "uc-uuid-9"]
}
```

---

### `POST /reports/{id}/finalize`

Zila President finalizes all reports in the Zila for the same month. No request body.

**Response 200:**
```json
{
  "finalized_report_ids": ["report-uuid-1", "report-uuid-2"],
  "finalized_at": "2025-02-15T09:00:00Z",
  "finalized_by": "zila-president-member-id"
}
```

---

## Activities

Activity definitions are the master list of predefined activities. They are returned inline inside `GET /reports/new` for the `activity_list` field type. Use this endpoint only if you need the raw list independently.

### `GET /activities`

**Query params:**

| Param         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `scope_level` | string | No       | `UC`, `Zone`, or `Zila` |
| `is_active`   | bool   | No       | Default: `true` |

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

`compulsory_per_month ≥ 1` means the activity is required that many times per month. `0` means optional.

---

### `POST /activities`

Create a new activity definition. Zila President only.

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

## Export

### `GET /reports/export`

Download an Excel report. The export scope is inferred from the `scope_level` of the given `unit_id` — UC exports one sheet, Zone exports all its UC sheets plus a summary, Zila exports everything.

**Query params:**

| Param     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `unit_id` | UUID   | Yes      | Any unit level |
| `month`   | string | Yes      | e.g. `2025-02` |

**Response 200:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="report_lahore_2025-02.xlsx"
```

Binary file stream. Trigger a file download using `URL.createObjectURL`.

**Response 404:**
```json
{
  "error": "not_found",
  "message": "No finalized report found for this unit and month."
}
```

---

## Audit Logs

### `GET /audit-logs`

Fetch the change history for any entity. Zila President and Zila Secretary only.

**Query params:**

| Param         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `entity_type` | string | Yes      | e.g. `monthly_report`, `member` |
| `entity_id`   | UUID   | Yes      | ID of the entity |

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