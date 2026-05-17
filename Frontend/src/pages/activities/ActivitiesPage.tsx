import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { listActivities, createActivity } from '@/api/activities'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import type { ScopeLevel } from '@/types'
import toast from 'react-hot-toast'

export default function ActivitiesPage() {
  const queryClient = useQueryClient()
  const { hasAnyRole } = useAuthStore()
  const canCreate = hasAnyRole(['ZILA_PRESIDENT'])

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScope, setNewScope] = useState<ScopeLevel | ''>('')
  const [newCompulsory, setNewCompulsory] = useState('0')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['activities'],
    queryFn: () => listActivities(),
  })

  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      toast.success('Activity created.')
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      setCreateOpen(false)
      setNewName(''); setNewScope(''); setNewCompulsory('0')
    },
  })

  const activities = data?.data || []

  return (
    <div>
      <Header title="Activity Definitions">
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Activity
          </Button>
        )}
      </Header>

      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>
          ) : isError ? (
            <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>
          ) : activities.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No activities defined" description="Activity definitions will appear here." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Scope</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Required/Month</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{act.name}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant="default">{act.scope_level}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-700">
                      {act.compulsory_per_month > 0 ? (
                        <span className="text-brand-600 font-medium">{act.compulsory_per_month}×</span>
                      ) : (
                        <span className="text-gray-400">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {act.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Activity Definition"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!newName || !newScope}
              loading={createMutation.isPending}
              onClick={() => newScope && createMutation.mutate({
                name: newName,
                scope_level: newScope as ScopeLevel,
                compulsory_per_month: parseInt(newCompulsory) || 0,
              })}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Activity Name" required value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Select
            label="Scope Level"
            required
            value={newScope}
            onChange={(e) => setNewScope(e.target.value as ScopeLevel)}
            options={[
              { value: 'UC', label: 'UC' },
              { value: 'Zone', label: 'Zone' },
              { value: 'Zila', label: 'Zila' },
            ]}
            placeholder="Select scope..."
          />
          <Input
            label="Required per month"
            type="number"
            min={0}
            value={newCompulsory}
            onChange={(e) => setNewCompulsory(e.target.value)}
            helperText="0 = optional"
          />
        </div>
      </Modal>
    </div>
  )
}
