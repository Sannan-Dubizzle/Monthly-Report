import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Download, Search, Filter, X } from 'lucide-react'
import { listReports, exportReport, downloadBlob } from '@/api/reports'
import { listUnits } from '@/api/units'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { formatMonth, formatDate } from '@/lib/utils'
import type { ReportStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: Array<{ value: ReportStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'zone_locked', label: 'Zone Locked' },
  { value: 'finalized', label: 'Finalized' },
]

export default function ReportsListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuthStore()

  const [page, setPage] = useState(1)
  const [monthFilter, setMonthFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('')
  const [unitFilter, setUnitFilter] = useState('')
  const [exportingUnit, setExportingUnit] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', page, monthFilter, statusFilter, unitFilter],
    queryFn: () =>
      listReports({
        page,
        per_page: 20,
        month: monthFilter || undefined,
        status: statusFilter || undefined,
        unit_id: unitFilter || undefined,
      }),
  })

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: () => listUnits(),
    enabled: hasPermission('units:list'),
  })

  const reports = data?.data || []
  const meta = data?.meta

  const hasFilters = monthFilter || statusFilter || unitFilter

  const clearFilters = () => {
    setMonthFilter('')
    setStatusFilter('')
    setUnitFilter('')
    setPage(1)
  }

  const handleExport = async (unitId: string, month: string) => {
    setExportingUnit(unitId)
    try {
      const blob = await exportReport(unitId, month.slice(0, 7))
      downloadBlob(blob, `report_${unitId}_${month.slice(0, 7)}.xlsx`)
      toast.success('Export downloaded.')
    } catch {
      toast.error('Export failed. Ensure the report is finalized.')
    } finally {
      setExportingUnit(null)
    }
  }

  return (
    <div>
      <Header title="Reports">
        {hasPermission('reports:create') && (
          <Button onClick={() => navigate('/reports/new')} size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Report
          </Button>
        )}
      </Header>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Month</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); setPage(1) }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as ReportStatus | ''); setPage(1) }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {unitsData && (
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit</label>
                <select
                  value={unitFilter}
                  onChange={(e) => { setUnitFilter(e.target.value); setPage(1) }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All units</option>
                  {unitsData.data.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.scope_level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              {meta ? `${meta.total} report${meta.total !== 1 ? 's' : ''}` : 'Reports'}
            </span>
            {hasFilters && (
              <span className="text-xs text-brand-600 font-medium">Filtered</span>
            )}
          </div>

          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={8} cols={5} /></div>
          ) : isError ? (
            <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>
          ) : reports.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No reports found"
                description={hasFilters ? 'Try adjusting your filters.' : 'No reports have been submitted yet.'}
                action={
                  hasPermission('reports:create') && !hasFilters
                    ? { label: 'Submit first report', onClick: () => navigate('/reports/new') }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Unit</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Month</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">President</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => navigate(`/reports/${report.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-gray-900">{report.unit_name}</div>
                        <div className="text-xs text-gray-400">{report.unit_scope}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{formatMonth(report.month)}</td>
                      <td className="px-4 py-3.5 text-gray-600">{report.president || '—'}</td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs">{formatDate(report.created_at)}</td>
                      <td className="px-4 py-3.5 text-right">
                        {hasPermission('reports:export') && report.status === 'finalized' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={exportingUnit === report.unit_id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExport(report.unit_id, report.month)
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && (
                <div className="px-6 border-t border-gray-100">
                  <Pagination
                    page={meta.page}
                    perPage={meta.per_page}
                    total={meta.total}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
