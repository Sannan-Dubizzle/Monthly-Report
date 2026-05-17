import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle2, Lock, Clock, Plus, Download } from 'lucide-react'
import { listReports } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { formatMonth, formatDate, getCurrentMonthParam } from '@/lib/utils'
import type { ReportListItem } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { member, hasPermission } = useAuthStore()
  const currentMonth = getCurrentMonthParam()

  // Fetch reports for current month
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'dashboard', currentMonth],
    queryFn: () => listReports({ month: currentMonth, per_page: 100 }),
  })

  const reports = data?.data || []

  const draftCount = reports.filter((r) => r.status === 'draft').length
  const lockedCount = reports.filter((r) => r.status === 'zone_locked').length
  const finalizedCount = reports.filter((r) => r.status === 'finalized').length

  const recentReports = reports.slice(0, 8)

  return (
    <div>
      <Header title="Dashboard">
        {hasPermission('reports:create') && (
          <Button onClick={() => navigate('/reports/new')} size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Report
          </Button>
        )}
      </Header>

      <div className="p-6 space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Good day, {member?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Reporting period: <span className="font-medium text-gray-700">{formatMonth(currentMonth + '-01')}</span>
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="Total Reports"
            value={reports.length}
            description="This reporting period"
            icon={<FileText className="h-4 w-4" />}
          />
          <KPICard
            title="Drafts"
            value={draftCount}
            description="Pending review"
            icon={<Clock className="h-4 w-4" />}
          />
          <KPICard
            title="Zone Locked"
            value={lockedCount}
            description="Awaiting finalization"
            icon={<Lock className="h-4 w-4" />}
          />
          <KPICard
            title="Finalized"
            value={finalizedCount}
            description="Completed"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Recent Reports</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest submissions this period</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
            >
              View all
            </Button>
          </div>

          <div className="px-6 py-4">
            {isLoading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : recentReports.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No reports yet"
                description="No reports have been submitted for this period."
                action={
                  hasPermission('reports:create')
                    ? { label: 'Create first report', onClick: () => navigate('/reports/new') }
                    : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-3 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Unit</th>
                      <th className="pb-3 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Month</th>
                      <th className="pb-3 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wide">President</th>
                      <th className="pb-3 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Status</th>
                      <th className="pb-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentReports.map((report) => (
                      <tr
                        key={report.id}
                        onClick={() => navigate(`/reports/${report.id}`)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium text-gray-900">{report.unit_name}</div>
                          <div className="text-xs text-gray-400">{report.unit_scope}</div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{formatMonth(report.month)}</td>
                        <td className="py-3 pr-4 text-gray-600">{report.president || '—'}</td>
                        <td className="py-3 pr-4 text-center">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="py-3 text-gray-400 text-xs">{formatDate(report.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {hasPermission('reports:create') && (
              <Button variant="outline" onClick={() => navigate('/reports/new')}>
                <Plus className="h-4 w-4" />
                Submit Report
              </Button>
            )}
            {hasPermission('reports:list') && (
              <Button variant="outline" onClick={() => navigate('/reports')}>
                <FileText className="h-4 w-4" />
                View Reports
              </Button>
            )}
            {hasPermission('members:list') && (
              <Button variant="outline" onClick={() => navigate('/members')}>
                View Members
              </Button>
            )}
            {hasPermission('reports:export') && (
              <Button variant="outline" onClick={() => navigate('/reports?export=true')}>
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
