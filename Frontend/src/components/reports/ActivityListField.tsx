import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { ActivityListOptions, ActivityOccurrenceInput } from '@/types'

interface ActivityRow extends ActivityOccurrenceInput {
  _key: string // local unique key for stable React keys
}

interface ActivityListFieldProps {
  options: ActivityListOptions
  value: ActivityOccurrenceInput[]
  onChange: (activities: ActivityOccurrenceInput[]) => void
  disabled?: boolean
}

function makeKey() {
  return Math.random().toString(36).slice(2)
}

export function ActivityListField({
  options,
  value,
  onChange,
  disabled,
}: ActivityListFieldProps) {
  const [rows, setRows] = useState<ActivityRow[]>(() => {
    // Initialize with predefined activities
    const predefined: ActivityRow[] = options.definitions.map((def) => {
      const existing = value.find((v) => v.definition_id === def.id)
      return {
        _key: makeKey(),
        definition_id: def.id,
        name: def.name,
        occurrences: existing?.occurrences ?? 0,
        avg_attendance: existing?.avg_attendance ?? null,
        conductor: existing?.conductor ?? null,
      }
    })

    // Add custom rows that exist in value but not in definitions
    const customRows: ActivityRow[] = value
      .filter((v) => v.definition_id === null)
      .map((v) => ({
        _key: makeKey(),
        ...v,
      }))

    return [...predefined, ...customRows]
  })

  // Sync changes up
  useEffect(() => {
    onChange(
      rows
        .filter((r) => r.occurrences > 0) // only include activities with at least 1 occurrence
        .map(({ _key, ...rest }) => rest)
    )
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (key: string, field: Partial<ActivityRow>) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...field } : r)))
  }

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r._key !== key))
  }

  const addCustomRow = () => {
    setRows((prev) => [
      ...prev,
      {
        _key: makeKey(),
        definition_id: null,
        name: '',
        occurrences: 1,
        avg_attendance: null,
        conductor: null,
      },
    ])
  }

  const predefinedIds = new Set(options.definitions.map((d) => d.id))

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-1">
        <div className="col-span-4 text-xs font-medium text-gray-400 uppercase tracking-wide">Activity</div>
        <div className="col-span-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Times</div>
        <div className="col-span-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-center">Avg. Attendance</div>
        <div className="col-span-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Conductor</div>
        <div className="col-span-1" />
      </div>

      {rows.map((row) => {
        const isPredefined = row.definition_id !== null && predefinedIds.has(row.definition_id)
        const isCompulsory = options.definitions.find((d) => d.id === row.definition_id)?.compulsory_per_month ?? 0

        return (
          <div
            key={row._key}
            className={cn(
              'grid grid-cols-12 gap-2 items-center rounded-lg p-2 border',
              isCompulsory > 0 ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100 bg-gray-50'
            )}
          >
            {/* Activity name */}
            <div className="col-span-4">
              {isPredefined ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800">{row.name}</span>
                  {isCompulsory > 0 && (
                    <span className="text-xs text-brand-600 font-medium">✦ Required</span>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Activity name"
                  value={row.name}
                  disabled={disabled}
                  onChange={(e) => updateRow(row._key, { name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              )}
            </div>

            {/* Occurrences */}
            <div className="col-span-2">
              <input
                type="number"
                min={0}
                value={row.occurrences}
                disabled={disabled}
                onChange={(e) => updateRow(row._key, { occurrences: parseInt(e.target.value) || 0 })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Avg attendance */}
            <div className="col-span-2">
              <input
                type="number"
                min={0}
                placeholder="—"
                value={row.avg_attendance ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  updateRow(row._key, {
                    avg_attendance: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Conductor */}
            <div className="col-span-3">
              <input
                type="text"
                placeholder="Conductor (optional)"
                value={row.conductor ?? ''}
                disabled={disabled}
                onChange={(e) => updateRow(row._key, { conductor: e.target.value || null })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Remove (custom only) */}
            <div className="col-span-1 flex justify-center">
              {!isPredefined && (
                <button
                  type="button"
                  onClick={() => removeRow(row._key)}
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Add custom activity */}
      {options.allow_custom && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addCustomRow}
          className="text-brand-600 hover:text-brand-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add custom activity
        </Button>
      )}
    </div>
  )
}
