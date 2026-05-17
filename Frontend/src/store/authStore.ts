import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthMember, Permission, Role } from '@/types'

interface AuthState {
  member: AuthMember | null
  isAuthenticated: boolean

  // Actions
  setMember: (member: AuthMember) => void
  clearMember: () => void
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  isZilaLevel: () => boolean
  isZoneLevel: () => boolean
  isUCLevel: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      member: null,
      isAuthenticated: false,

      setMember: (member) => set({ member, isAuthenticated: true }),

      clearMember: () => set({ member: null, isAuthenticated: false }),

      hasPermission: (permission) => {
        const { member } = get()
        if (!member) return false
        return member.permissions.includes(permission)
      },

      hasRole: (role) => {
        const { member } = get()
        if (!member) return false
        return member.roles.includes(role)
      },

      hasAnyRole: (roles) => {
        const { member } = get()
        if (!member) return false
        return roles.some((r) => member.roles.includes(r))
      },

      isZilaLevel: () => {
        const { member } = get()
        if (!member) return false
        return member.roles.some((r) => r.startsWith('ZILA_'))
      },

      isZoneLevel: () => {
        const { member } = get()
        if (!member) return false
        return member.roles.some((r) => r.startsWith('ZONE_'))
      },

      isUCLevel: () => {
        const { member } = get()
        if (!member) return false
        return member.roles.some((r) => r.startsWith('UC_'))
      },
    }),
    {
      name: 'mrs_auth',
      partialize: (state) => ({ member: state.member, isAuthenticated: state.isAuthenticated }),
    }
  )
)
