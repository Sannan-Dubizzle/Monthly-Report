import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Download, Lock, CheckCheck, Edit2 } from 'lucide-react'
import { getReport, lockZone, finalizeReports, exportReport, downloadBlob } from '@/api/reports'
import { getAuditLogs } from '@/api/auditLogs'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/Modal'
import { formatMonth, formatDate, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission, hasAnyRole } = useAuthStore()

  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!, true),
    enabled: !!id,
  })

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs', 'monthly_report', id],
    queryFn: () => getAuditLogs('monthly_report', id!),
    enabled: !!id && hasAnyRole(['ZILA_PRESIDENT', 'ZILA_SECRETARY']),
  })

  const lockMutation = useMutation({
    mutationFn: () => lockZone(id!),
    onSuccess: () => {
      toast.success('Reports locked for zone.')
      queryClient.invalidateQueries({ queryKey: ['report', id] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeReports(id!),
    onSuccess: () => {
      toast.success('Reports finalized.')
      queryClient.invalidateQueries({ queryKey: ['report', id] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const handleExport = async () => {
    if (!report) return
    setExportLoading(true)
    try {
      const blob = await exportReport(report.unit.id, report.month)
      downloadBlob(blob, `report_${report.unit.name.replace(/\s+/g, '_')}_${report.month.slice(0, 7)}.xlsx`)
      toast.success('Export downloaded.')
    } catch {
      toast.error('Export failed.')
    } finally {
      setExportLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Report" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div>
        <Header title="Report" />
        <div className="p-6">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </div>
    )
  }

  const canEdit =
    hasPermission('reports:update') &&
    (report.status === 'draft' ||
      (report.status === 'zone_locked' && hasAnyRole(['ZILA_PRESIDENT'])))

  const canLock =
    hasPermission('reports:lock_zone') &&
    report.status === 'draft'

  const canFinalize =
    hasPermission('reports:finalize') &&
    report.status === 'zone_locked'

  const canExport =
    hasPermission('reports:export') &&
    report.status === 'finalized'

  return (
    <div>
      <Header title={`Report — ${report.unit.name}`}>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/reports/${id}/edit`)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {canLock && (
            <Button size="sm" variant="secondary" onClick={() => setLockModalOpen(true)}>
              <Lock className="h-3.5 w-3.5" />
              Lock Zone
            </Button>
          )}
          {canFinalize && (
            <Button size="sm" onClick={() => setFinalizeModalOpen(true)}>
              <CheckCheck className="h-3.5 w-3.5" />
              Finalize
            </Button>
          )}
          {canExport && (
            <Button variant="outline" size="sm" onClick={handleExport} loading={exportLoading}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>
      </Header>

      <div className="p-6 space-y-5 max-w-4xl">
        {/* Back link */}
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All Reports
        </button>

        {/* Report header card */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{report.unit.name}</h2>
                <StatusBadge status={report.status} />
              </div>
              <p className="text-sm text-gray-500">
                {formatMonth(report.month)} · {report.unit.scope_level}
              </p>
            </div>
            <div className="text-right text-sm space-y-0.5">
              <p className="text-gray-500">Submitted <span className="text-gray-900">{formatDate(report.created_at)}</span></p>
              {report.locked_at && (
                <p className="text-gray-500">Locked <span className="text-gray-900">{formatDate(report.locked_at)}</span></p>
              )}
              {report.finalized_at && (
                <p className="text-gray-500">Finalized <span className="text-gray-900">{formatDate(report.finalized_at)}</span></p>
              )}
            </div>
          </div>
        </Card>

        {/* Leadership */}
        <Card>
          <CardHeader title="Leadership" />
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">President (Sadar)</p>
              <p className="text-sm font-medium text-gray-900">
                {report.president_member_id || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Secretary</p>
              <p className="text-sm font-medium text-gray-900">
                {report.secretary_member_id || '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Field Values */}
        {report.field_values.length > 0 && (
          <Card>
            <CardHeader title="Report Data" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {report.field_values.map((fv) => (
                <div key={fv.field_id}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 capitalize">
                    {fv.field_key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {fv.value ?? <span className="text-gray-400">—</span>}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Activities */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Activities</h3>
          </div>
          {report.activities.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-400 text-center">
              No activities recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Activity</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Times</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Avg. Attendance</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Total Attendance</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Conductor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.activities.map((act) => {
                    const total =
                      act.occurrences && act.avg_attendance
                        ? act.occurrences * act.avg_attendance
                        : null
                    return (
                      <tr key={act.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5">
                          <span className="font-medium text-gray-900">{act.name}</span>
                          {!act.definition_id && (
                            <span className="ml-2 text-xs text-gray-400">(custom)</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700">{act.occurrences}</td>
                        <td className="px-4 py-3.5 text-right text-gray-700">
                          {act.avg_attendance ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                          {total ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">{act.conductor || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Audit Log */}
        {auditData && auditData.data.length > 0 && (
          <Card padding="none">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Change History</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {auditData.data.map((log) => (
                <div key={log.id} className="px-6 py-3 text-sm flex items-start gap-4">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{log.changed_by.name}</span>
                    <span className="text-gray-500"> changed </span>
                    <span className="font-medium text-gray-700">{log.field_name}</span>
                    <span className="text-gray-500"> from </span>
                    <span className="font-mono text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                      {log.old_value ?? 'empty'}
                    </span>
                    <span className="text-gray-500"> to </span>
                    <span className="font-mono text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                      {log.new_value ?? 'empty'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDateTime(log.changed_at)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Lock Zone Modal */}
      <ConfirmModal
        open={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        onConfirm={() => {
          lockMutation.mutate()
          setLockModalOpen(false)
        }}
        title="Lock Zone Reports"
        description="This will lock all UC reports in your zone for this month. UC and Zone users will no longer be able to make changes. Continue?"
        confirmLabel="Lock Zone"
        loading={lockMutation.isPending}
      />

      {/* Finalize Modal */}
      <ConfirmModal
        open={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        onConfirm={() => {
          finalizeMutation.mutate()
          setFinalizeModalOpen(false)
        }}
        title="Finalize Reports"
        description="This will permanently finalize all reports in the Zila for this month. No further edits will be possible. Continue?"
        confirmLabel="Finalize"
        loading={finalizeMutation.isPending}
      />
    </div>
  )
}
