# Monthly Reporting App — Setup

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API URL
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL=https://your-backend/api/v1

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

## Project Structure

```
src/
├── api/              # API call functions (one file per resource)
│   ├── auth.ts
│   ├── reports.ts
│   ├── members.ts
│   ├── units.ts
│   ├── activities.ts
│   └── auditLogs.ts
├── components/
│   ├── layout/       # AppLayout, Sidebar, Header, ProtectedRoute
│   ├── ui/           # Button, Badge, Card, Input, Modal, Skeleton, etc.
│   └── reports/      # ActivityListField, MemberPickerField
├── lib/
│   ├── apiClient.ts  # Axios instance with JWT auto-refresh
│   └── utils.ts      # cn(), formatMonth(), formatDate()
├── pages/
│   ├── auth/         # LoginPage
│   ├── dashboard/    # DashboardPage
│   ├── reports/      # ReportsListPage, ReportDetailPage, NewReportPage
│   ├── members/      # MembersListPage, MemberDetailPage
│   ├── units/        # UnitsPage
│   └── activities/   # ActivitiesPage
├── store/
│   └── authStore.ts  # Zustand auth store (persisted)
├── types/
│   └── index.ts      # All TypeScript types
├── App.tsx           # Router setup (lazy-loaded routes)
└── main.tsx          # QueryClient + Toaster bootstrap
```

## Key Design Decisions

- **JWT Auto-Refresh** — `apiClient.ts` intercepts 401s, silently refreshes using the stored refresh token, then retries the failed request. If refresh fails, redirects to `/login`.
- **Permission-gated UI** — `useAuthStore.hasPermission()` is used throughout to show/hide buttons/routes. The backend enforces these server-side too.
- **Dynamic Report Form** — `NewReportPage` fetches `GET /reports/new` and renders all field types (`text`, `number`, `boolean`, `date`, `dropdown`, `member_picker`, `activity_list`) dynamically. Adding new fields to the backend automatically appears in the UI.
- **Activity List** — Predefined activities are rendered as fixed rows; custom activities can be added/removed. Compulsory activities are visually marked.
- **Lazy Loading** — All pages are lazy-loaded via `React.lazy()` for fast initial load.
- **Zustand + Persist** — Auth state (member info, permissions) is persisted to localStorage so page refresh doesn't log users out.

## Role Capabilities Summary

| Role | Reports | Members | Units | Roles |
|------|---------|---------|-------|-------|
| UC President/Secretary | Create, edit own UC (draft only) | Create in own UC | Read | — |
| Zone President/Secretary | Edit all UCs in zone, Lock Zone | List/read | Read | — |
| Zila President | Edit all, Lock, Finalize | Create/read | Create/edit | Assign/revoke |
| Zila Secretary | Read-only, Export | Read | Read | — |
