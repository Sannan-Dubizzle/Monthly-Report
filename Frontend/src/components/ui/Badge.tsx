import { cn } from '@/lib/utils'
import type { ReportStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-gray-100 text-gray-700',
        variant === 'success' && 'bg-emerald-100 text-emerald-700',
        variant === 'warning' && 'bg-amber-100 text-amber-700',
        variant === 'danger' && 'bg-red-100 text-red-700',
        variant === 'info' && 'bg-blue-100 text-blue-700',
        variant === 'purple' && 'bg-purple-100 text-purple-700',
        className
      )}
    >
      {children}
    </span>
  )
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Draft', variant: 'warning' },
  zone_locked: { label: 'Zone Locked', variant: 'info' },
  finalized: { label: 'Finalized', variant: 'success' },
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  const label = role
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')

  const variant =
    role.startsWith('ZILA') ? 'purple' :
    role.startsWith('ZONE') ? 'info' :
    'default'

  return <Badge variant={variant}>{label}</Badge>
}
