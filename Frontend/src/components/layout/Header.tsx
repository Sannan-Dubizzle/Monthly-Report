import { Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { RoleBadge } from '@/components/ui/Badge'

interface HeaderProps {
  title?: string
  children?: React.ReactNode
}

export function Header({ title, children }: HeaderProps) {
  const { member } = useAuthStore()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {title && <h1 className="text-sm font-semibold text-gray-900">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {children}

        {member && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            {member.roles.slice(0, 2).map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
            <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold ml-1">
              {member.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
