import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { listMembers } from '@/api/members'
import { cn } from '@/lib/utils'

interface MemberPickerFieldProps {
  label?: string
  value: { id: string; name: string } | null
  onChange: (member: { id: string; name: string } | null) => void
  ucId?: string
  disabled?: boolean
  required?: boolean
  helperText?: string
}

export function MemberPickerField({
  label,
  value,
  onChange,
  ucId,
  disabled,
  required,
  helperText,
}: MemberPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['members', 'picker', ucId, search],
    queryFn: () =>
      listMembers({ uc_id: ucId, per_page: 20 }),
    enabled: open,
  })

  const members = data?.data || []
  const filtered = search
    ? members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : members

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm transition-colors text-left',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'border-gray-300 hover:border-gray-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed'
          )}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value ? value.name : 'Select member...'}
          </span>
          {value && !disabled && (
            <X
              className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
            />
          )}
        </button>

        {open && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No members found.</div>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange({ id: m.id, name: m.name })
                      setOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                      value?.id === m.id && 'bg-brand-50 text-brand-700'
                    )}
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.email}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
    </div>
  )
}
