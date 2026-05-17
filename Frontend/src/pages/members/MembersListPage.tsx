import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, UserCheck, UserX } from 'lucide-react'
import { listMembers, createMember } from '@/api/members'
import { listUnits } from '@/api/units'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge, RoleBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { Role } from '@/types'

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'UC_PRESIDENT', label: 'UC President' },
  { value: 'UC_SECRETARY', label: 'UC Secretary' },
  { value: 'ZONE_PRESIDENT', label: 'Zone President' },
  { value: 'ZONE_SECRETARY', label: 'Zone Secretary' },
  { value: 'ZILA_PRESIDENT', label: 'Zila President' },
  { value: 'ZILA_SECRETARY', label: 'Zila Secretary' },
]

export default function MembersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthStore()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [ucFilter, setUcFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUcId, setNewUcId] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['members', page, roleFilter, ucFilter],
    queryFn: () =>
      listMembers({
        page,
        per_page: 20,
        role: roleFilter || undefined,
        uc_id: ucFilter || undefined,
      }),
  })

  const { data: unitsData } = useQuery({
    queryKey: ['units', 'UC'],
    queryFn: () => listUnits({ scope_level: 'UC' }),
    enabled: hasPermission('units:list'),
  })

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      toast.success('Member created successfully.')
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setCreateOpen(false)
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewPassword(''); setNewUcId('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create member.'
      toast.error(msg)
    },
  })

  const members = data?.data || []
  const meta = data?.meta

  // Client-side search filter
  const filtered = search
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members

  const handleCreate = () => {
    if (!newName || !newEmail || !newPassword || !newUcId) {
      toast.error('Please fill all required fields.')
      return
    }
    createMutation.mutate({
      name: newName,
      email: newEmail,
      phone: newPhone || undefined,
      password: newPassword,
      uc_id: newUcId,
    })
  }

  return (
    <div>
      <Header title="Members">
        {hasPermission('members:create') && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </Button>
        )}
      </Header>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value as Role | ''); setPage(1) }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {unitsData && (
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">UC</label>
                <select
                  value={ucFilter}
                  onChange={(e) => { setUcFilter(e.target.value); setPage(1) }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All UCs</option>
                  {unitsData.data.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              {meta ? `${meta.total} member${meta.total !== 1 ? 's' : ''}` : 'Members'}
            </span>
          </div>

          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>
          ) : isError ? (
            <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No members found"
                description={search ? 'Try a different search.' : 'No members have been added yet.'}
                action={
                  hasPermission('members:create')
                    ? { label: 'Add first member', onClick: () => setCreateOpen(true) }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">UC</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Roles</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => navigate(`/members/${member.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">{member.uc.name}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <RoleBadge key={role} role={role} />
                          ))}
                          {member.roles.length === 0 && (
                            <span className="text-gray-400 text-xs">No roles</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {member.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && (
                <div className="px-6 border-t border-gray-100">
                  <Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onPageChange={setPage} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Member Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add New Member"
        description="Create a new member account for the organization."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Create Member</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ali Raza"
          />
          <Input
            label="Email"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="ali@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+923001234567"
          />
          <Input
            label="Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {unitsData && (
            <Select
              label="Unit (UC)"
              required
              value={newUcId}
              onChange={(e) => setNewUcId(e.target.value)}
              options={unitsData.data.map((u) => ({ value: u.id, label: u.name }))}
              placeholder="Select UC..."
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
