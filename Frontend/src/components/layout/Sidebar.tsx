import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { logout } from '@/api/auth'
import { getRefreshToken, clearTokens } from '@/lib/apiClient'
import toast from 'react-hot-toast'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  permission?: string
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    to: '/dashboard',
  },
  {
    label: 'Reports',
    icon: <FileText className="h-4 w-4" />,
    to: '/reports',
    permission: 'reports:list',
  },
  {
    label: 'Members',
    icon: <Users className="h-4 w-4" />,
    to: '/members',
    permission: 'members:list',
  },
  {
    label: 'Units',
    icon: <Building2 className="h-4 w-4" />,
    to: '/units',
    permission: 'units:list',
  },
  {
    label: 'Activities',
    icon: <Activity className="h-4 w-4" />,
    to: '/activities',
    permission: 'activities:list',
  },
  {
    label: 'Audit Logs',
    icon: <ScrollText className="h-4 w-4" />,
    to: '/audit-logs',
    roles: ['ZILA_PRESIDENT', 'ZILA_SECRETARY'],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { member, hasPermission, hasAnyRole, clearMember } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await logout(refreshToken)
      }
    } catch {
      clearTokens()
    } finally {
      clearMember()
      navigate('/login')
      toast.success('Logged out successfully.')
    }
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.permission && !hasPermission(item.permission as never)) return false
    if (item.roles && !hasAnyRole(item.roles as never[])) return false
    return true
  })

  return (
    <aside
      className={cn(
        'h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200 sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 text-sm leading-tight">
            Monthly<br />Reports
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-100 p-2">
        {!collapsed && member && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
            <p className="text-xs text-gray-400 truncate">{member.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Log out'}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mt-0.5',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
