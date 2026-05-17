import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Skeleton } from '@/components/ui/Skeleton'

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ReportsListPage = lazy(() => import('@/pages/reports/ReportsListPage'))
const ReportDetailPage = lazy(() => import('@/pages/reports/ReportDetailPage'))
const NewReportPage = lazy(() => import('@/pages/reports/NewReportPage'))
const MembersListPage = lazy(() => import('@/pages/members/MembersListPage'))
const MemberDetailPage = lazy(() => import('@/pages/members/MemberDetailPage'))
const UnitsPage = lazy(() => import('@/pages/units/UnitsPage'))
const ActivitiesPage = lazy(() => import('@/pages/activities/ActivitiesPage'))

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredPermission="reports:list">
            <Suspense fallback={<PageLoader />}>
              <ReportsListPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/new',
        element: (
          <ProtectedRoute requiredPermission="reports:create">
            <Suspense fallback={<PageLoader />}>
              <NewReportPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/:id',
        element: (
          <ProtectedRoute requiredPermission="reports:read">
            <Suspense fallback={<PageLoader />}>
              <ReportDetailPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'members',
        element: (
          <ProtectedRoute requiredPermission="members:list">
            <Suspense fallback={<PageLoader />}>
              <MembersListPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'members/:id',
        element: (
          <ProtectedRoute requiredPermission="members:read">
            <Suspense fallback={<PageLoader />}>
              <MemberDetailPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'units',
        element: (
          <ProtectedRoute requiredPermission="units:list">
            <Suspense fallback={<PageLoader />}>
              <UnitsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'activities',
        element: (
          <ProtectedRoute requiredPermission="activities:list">
            <Suspense fallback={<PageLoader />}>
              <ActivitiesPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
