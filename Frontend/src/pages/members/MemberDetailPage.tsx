import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { getMember, assignRole, revokeRole } from '@/api/members'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge, RoleBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import type { Role } from '@/types'
import toast from 'react-hot-toast'

const ALL_ROLES: Array<{ value: Role; label: string }> = [
  { value: 'UC_PRESIDENT', label: 'UC President' },
  { value: 'UC_SECRETARY', label: 'UC Secretary' },
  { value: 'ZONE_PRESIDENT', label: 'Zone President' },
  { value: 'ZONE_SECRETARY', label: 'Zone Secretary' },
  { value: 'ZILA_PRESIDENT', label: 'Zila President' },
  { value: 'ZILA_SECRETARY', label: 'Zila Secretary' },
]

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasAnyRole } = useAuthStore()

  const [assignRoleOpen, setAssignRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | ''>('')
  const [revokeTarget, setRevokeTarget] = useState<Role | null>(null)

  const canManageRoles = hasAnyRole(['ZILA_PRESIDENT'])

  const { data: member, isLoading, isError, refetch } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMember(id!),
    enabled: !!id,
  })

  const assignMutation = useMutation({
    mutationFn: (role: Role) => assignRole(id!, role),
    onSuccess: () => {
      toast.success('Role assigned.')
      queryClient.invalidateQueries({ queryKey: ['member', id] })
      setAssignRoleOpen(false)
      setSelectedRole('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to assign role.'
      toast.error(msg)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (role: Role) => revokeRole(id!, role),
    onSuccess: () => {
      toast.success('Role revoked.')
      queryClient.invalidateQueries({ queryKey: ['member', id] })
      setRevokeTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to revoke role.'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div>
        <Header title="Member" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div>
        <Header title="Member" />
        <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>
      </div>
    )
  }

  const availableRoles = ALL_ROLES.filter((r) => !member.roles.includes(r.value))

  return (
    <div>
      <Header title={member.name} />

      <div className="p-6 max-w-2xl space-y-5">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All Members
        </button>

        {/* Profile card */}
        <Card>
          <div className="flex items-start gap-5">
            <div className="h-14 w-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-semibold text-gray-900">{member.name}</h2>
                {member.is_active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="danger">Inactive</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">{member.email}</p>
              {member.phone && <p className="text-sm text-gray-400">{member.phone}</p>}
              <p className="text-sm text-gray-500 mt-2">
                Unit: <span className="font-medium text-gray-800">{member.uc.name}</span>
              </p>
              {member.created_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Joined {formatDate(member.created_at)}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Roles card */}
        <Card>
          <CardHeader
            title="Roles"
            description="Roles determine what this member can access and do."
            action={
              canManageRoles && availableRoles.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setAssignRoleOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Assign Role
                </Button>
              ) : undefined
            }
          />

          {member.roles.length === 0 ? (
            <p className="text-sm text-gray-400">No roles assigned.</p>
          ) : (
            <div className="space-y-2">
              {member.roles.map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                >
                  <RoleBadge role={role} />
                  {canManageRoles && (
                    <button
                      onClick={() => setRevokeTarget(role)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Revoke role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Assign Role Modal */}
      <Modal
        open={assignRoleOpen}
        onClose={() => setAssignRoleOpen(false)}
        title="Assign Role"
        description={`Assign a role to ${member.name}.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignRoleOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedRole}
              loading={assignMutation.isPending}
              onClick={() => selectedRole && assignMutation.mutate(selectedRole as Role)}
            >
              Assign
            </Button>
          </>
        }
      >
        <Select
          label="Role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as Role)}
          options={availableRoles}
          placeholder="Select role..."
        />
      </Modal>

      {/* Revoke Role Confirm */}
      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget)}
        title="Revoke Role"
        description={`Remove the role "${revokeTarget}" from ${member.name}?`}
        confirmLabel="Revoke"
        danger
        loading={revokeMutation.isPending}
      />
    </div>
  )
}
