import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import { listUnits, createUnit, updateUnit } from '@/api/units'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import type { ScopeLevel, Unit } from '@/types'
import toast from 'react-hot-toast'

const SCOPE_COLORS: Record<ScopeLevel, 'purple' | 'info' | 'default'> = {
  Zila: 'purple',
  Zone: 'info',
  UC: 'default',
}

export default function UnitsPage() {
  const queryClient = useQueryClient()
  const { hasPermission, hasAnyRole } = useAuthStore()
  const canCreate = hasAnyRole(['ZILA_PRESIDENT'])

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScopeLevel, setNewScopeLevel] = useState<ScopeLevel | ''>('')
  const [newParentId, setNewParentId] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['units', 'all'],
    queryFn: () => listUnits(),
  })

  const createMutation = useMutation({
    mutationFn: createUnit,
    onSuccess: () => {
      toast.success('Unit created.')
      queryClient.invalidateQueries({ queryKey: ['units'] })
      setCreateOpen(false)
      setNewName(''); setNewScopeLevel(''); setNewParentId('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create unit.'
      toast.error(msg)
    },
  })

  const units = data?.data || []

  // Group by scope level
  const zilas = units.filter((u) => u.scope_level === 'Zila')
  const zones = units.filter((u) => u.scope_level === 'Zone')
  const ucs = units.filter((u) => u.scope_level === 'UC')

  const parentOptions = units
    .filter((u) => {
      if (newScopeLevel === 'Zone') return u.scope_level === 'Zila'
      if (newScopeLevel === 'UC') return u.scope_level === 'Zone'
      return false
    })
    .map((u) => ({ value: u.id, label: u.name }))

  const handleCreate = () => {
    if (!newName || !newScopeLevel || (newScopeLevel !== 'Zila' && !newParentId)) {
      toast.error('Fill in all required fields.')
      return
    }
    createMutation.mutate({
      name: newName,
      scope_level: newScopeLevel as ScopeLevel,
      parent_id: newParentId,
    })
  }

  return (
    <div>
      <Header title="Units">
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Unit
          </Button>
        )}
      </Header>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="bg-white rounded-xl border p-6"><TableSkeleton rows={5} cols={3} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : units.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No units found"
            description="The organizational hierarchy has not been set up yet."
          />
        ) : (
          <>
            {/* Zila level */}
            {zilas.length > 0 && (
              <Card padding="none">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Zila (District)</h3>
                </div>
                <UnitTable units={zilas} />
              </Card>
            )}

            {/* Zone level */}
            {zones.length > 0 && (
              <Card padding="none">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Zones</h3>
                </div>
                <UnitTable units={zones} parentUnits={zilas} />
              </Card>
            )}

            {/* UC level */}
            {ucs.length > 0 && (
              <Card padding="none">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">UCs (Union Councils / Halqas)</h3>
                </div>
                <UnitTable units={ucs} parentUnits={zones} />
              </Card>
            )}
          </>
        )}
      </div>

      {/* Create Unit Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Unit"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Unit Name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Halqa Model Town"
          />
          <Select
            label="Level"
            required
            value={newScopeLevel}
            onChange={(e) => { setNewScopeLevel(e.target.value as ScopeLevel); setNewParentId('') }}
            options={[
              { value: 'Zila', label: 'Zila (District)' },
              { value: 'Zone', label: 'Zone' },
              { value: 'UC', label: 'UC (Union Council)' },
            ]}
            placeholder="Select level..."
          />
          {newScopeLevel && newScopeLevel !== 'Zila' && (
            <Select
              label="Parent Unit"
              required
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              options={parentOptions}
              placeholder={`Select parent ${newScopeLevel === 'UC' ? 'Zone' : 'Zila'}...`}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}

function UnitTable({ units, parentUnits }: { units: Unit[]; parentUnits?: Unit[] }) {
  const parentMap = Object.fromEntries((parentUnits || []).map((u) => [u.id, u.name]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
            {parentUnits && (
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Parent</th>
            )}
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">President</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Level</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {units.map((unit) => (
            <tr key={unit.id} className="hover:bg-gray-50">
              <td className="px-6 py-3.5 font-medium text-gray-900">{unit.name}</td>
              {parentUnits && (
                <td className="px-4 py-3.5 text-gray-500">
                  {unit.parent_id ? (parentMap[unit.parent_id] || '—') : '—'}
                </td>
              )}
              <td className="px-4 py-3.5 text-gray-600">
                {unit.president?.name || <span className="text-gray-400">Unassigned</span>}
              </td>
              <td className="px-4 py-3.5 text-center">
                <Badge variant={SCOPE_COLORS[unit.scope_level]}>{unit.scope_level}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
