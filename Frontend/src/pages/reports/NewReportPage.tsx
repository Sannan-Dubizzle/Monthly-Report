import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { getNewReportSchema, createReport } from '@/api/reports'
import { listUnits } from '@/api/units'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { ActivityListField } from '@/components/reports/ActivityListField'
import { MemberPickerField } from '@/components/reports/MemberPickerField'
import { formatMonth, cn } from '@/lib/utils'
import type {
  FormSection,
  FormField,
  ActivityListOptions,
  ActivityOccurrenceInput,
} from '@/types'
import toast from 'react-hot-toast'

export default function NewReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { member } = useAuthStore()

  // Unit selection
  const [selectedUnitId, setSelectedUnitId] = useState(
    searchParams.get('unit_id') || member?.uc_id || ''
  )
  const [confirmedUnit, setConfirmedUnit] = useState(!!searchParams.get('unit_id'))

  // Form state
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [activities, setActivities] = useState<ActivityOccurrenceInput[]>([])
  const [currentSection, setCurrentSection] = useState(0)

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: () => listUnits(),
  })

  const {
    data: schema,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'new', selectedUnitId],
    queryFn: () => getNewReportSchema(selectedUnitId),
    enabled: confirmedUnit && !!selectedUnitId,
  })

  // Pre-fill values from schema
  useEffect(() => {
    if (!schema) return
    const initial: Record<string, unknown> = {}
    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.prefill_value !== null) {
          initial[field.key] = field.prefill_value
        }
      })
    })
    setFieldValues(initial)
  }, [schema])

  const mutation = useMutation({
    mutationFn: createReport,
    onSuccess: (report) => {
      toast.success('Report submitted successfully!')
      navigate(`/reports/${report.id}`)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit report.'
      if (
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ===
        'report_exists'
      ) {
        const existingId = (err as { response?: { data?: { existing_report_id?: string } } })
          ?.response?.data?.existing_report_id
        toast.error('A report for this unit/month already exists.')
        if (existingId) navigate(`/reports/${existingId}`)
      } else {
        toast.error(message)
      }
    },
  })

  const handleSubmit = () => {
    if (!schema) return

    // Build field_values array from all fields across all sections
    const fieldValuesArr: Array<{ field_id: string; value: string | null }> = []
    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type === 'activity_list') return
        if (field.type === 'member_picker') return

        // Find field_id from schema — we'll derive it from field.key matching field_values in existing report
        // Since new report schema doesn't expose field_id directly, we use field.key as a proxy here
        // In reality, the field_id is exposed differently; we reconstruct from the schema ordering
        const value = fieldValues[field.key]
        const strValue =
          value === null || value === undefined
            ? null
            : typeof value === 'boolean'
            ? String(value)
            : String(value)

        // Note: field_id should come from schema field metadata
        // Using field.key as placeholder — production would need field_id in schema
        fieldValuesArr.push({ field_id: field.key, value: strValue })
      })
    })

    const presidentField = fieldValues['president_member_id'] as { id: string } | null
    const secretaryField = fieldValues['secretary_member_id'] as { id: string } | null

    mutation.mutate({
      unit_id: selectedUnitId,
      month: schema.month,
      president_member_id: presidentField?.id ?? null,
      secretary_member_id: secretaryField?.id ?? null,
      activities,
      field_values: fieldValuesArr,
    })
  }

  const sections = schema?.sections || []
  const totalSections = sections.length
  const isLastSection = currentSection === totalSections - 1

  if (!confirmedUnit) {
    return (
      <div>
        <Header title="Submit New Report" />
        <div className="p-6 max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Select Unit</h2>
              <p className="text-sm text-gray-500 mt-1">Choose the UC to submit a report for.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a unit...</option>
                {unitsData?.data
                  .filter((u) => u.scope_level === 'UC')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>
            <Button
              disabled={!selectedUnitId}
              onClick={() => setConfirmedUnit(true)}
              className="w-full"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Submit New Report">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/reports')}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </Header>

      <div className="p-6 max-w-3xl space-y-6">
        {/* Report info */}
        {schema && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{schema.unit.name}</span>
            <span className="text-gray-300">·</span>
            <span>{formatMonth(schema.month)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">{schema.unit.scope_level}</span>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        )}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {schema && sections.length > 0 && (
          <>
            {/* Section progress */}
            <div className="flex items-center gap-2">
              {sections.map((section, i) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setCurrentSection(i)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    i === currentSection
                      ? 'bg-brand-600 text-white'
                      : i < currentSection
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {i < currentSection && <Check className="h-3 w-3" />}
                  {section.label}
                </button>
              ))}
            </div>

            {/* Current section */}
            <SectionForm
              section={sections[currentSection]}
              fieldValues={fieldValues}
              activities={activities}
              ucId={selectedUnitId}
              onFieldChange={(key, value) =>
                setFieldValues((prev) => ({ ...prev, [key]: value }))
              }
              onActivitiesChange={setActivities}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentSection((i) => Math.max(0, i - 1))}
                disabled={currentSection === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {isLastSection ? (
                <Button
                  onClick={handleSubmit}
                  loading={mutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  Submit Report
                </Button>
              ) : (
                <Button onClick={() => setCurrentSection((i) => i + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Section renderer ─────────────────────────────────────────────────────────

interface SectionFormProps {
  section: FormSection
  fieldValues: Record<string, unknown>
  activities: ActivityOccurrenceInput[]
  ucId: string
  onFieldChange: (key: string, value: unknown) => void
  onActivitiesChange: (activities: ActivityOccurrenceInput[]) => void
}

function SectionForm({
  section,
  fieldValues,
  activities,
  ucId,
  onFieldChange,
  onActivitiesChange,
}: SectionFormProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{section.label}</h3>
      </div>
      <div className="space-y-5">
        {section.fields.map((field) => (
          <DynamicField
            key={field.key}
            field={field}
            value={fieldValues[field.key]}
            activities={activities}
            ucId={ucId}
            onChange={(val) => onFieldChange(field.key, val)}
            onActivitiesChange={onActivitiesChange}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────

interface DynamicFieldProps {
  field: FormField
  value: unknown
  activities: ActivityOccurrenceInput[]
  ucId: string
  onChange: (value: unknown) => void
  onActivitiesChange: (activities: ActivityOccurrenceInput[]) => void
}

function DynamicField({
  field,
  value,
  activities,
  ucId,
  onChange,
  onActivitiesChange,
}: DynamicFieldProps) {
  const labelEl = (
    <label className="text-sm font-medium text-gray-700">
      {field.label}
      {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  switch (field.type) {
    case 'text':
      return (
        <div className="flex flex-col gap-1.5">
          {labelEl}
          <input
            type="text"
            required={field.is_required}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {field.helper_text && <p className="text-xs text-gray-400">{field.helper_text}</p>}
        </div>
      )

    case 'number':
      return (
        <div className="flex flex-col gap-1.5">
          {labelEl}
          <input
            type="number"
            required={field.is_required}
            min={field.validation?.min}
            max={field.validation?.max}
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {field.helper_text && <p className="text-xs text-gray-400">{field.helper_text}</p>}
        </div>
      )

    case 'boolean':
      return (
        <div className="flex flex-col gap-2">
          {labelEl}
          <div className="flex gap-3">
            {[
              { val: true, label: 'Yes' },
              { val: false, label: 'No' },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange(val)}
                className={cn(
                  'px-5 py-2 rounded-lg border text-sm font-medium transition-all',
                  value === val
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {field.helper_text && <p className="text-xs text-gray-400">{field.helper_text}</p>}
        </div>
      )

    case 'date':
      return (
        <div className="flex flex-col gap-1.5">
          {labelEl}
          <input
            type="date"
            required={field.is_required}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {field.helper_text && <p className="text-xs text-gray-400">{field.helper_text}</p>}
        </div>
      )

    case 'dropdown': {
      const opts = Array.isArray(field.options)
        ? (field.options as Array<{ value: string; label: string }>)
        : []
      return (
        <div className="flex flex-col gap-1.5">
          {labelEl}
          <select
            required={field.is_required}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select...</option>
            {opts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {field.helper_text && <p className="text-xs text-gray-400">{field.helper_text}</p>}
        </div>
      )
    }

    case 'member_picker': {
      const memberVal = value as { id: string; name: string } | null
      return (
        <MemberPickerField
          label={field.label}
          value={memberVal}
          onChange={onChange}
          ucId={ucId}
          required={field.is_required}
          helperText={field.helper_text ?? undefined}
        />
      )
    }

    case 'activity_list': {
      const opts = field.options as ActivityListOptions
      if (!opts) return null
      return (
        <div className="flex flex-col gap-3">
          {labelEl}
          {field.helper_text && <p className="text-xs text-gray-400">{field.helper_text}</p>}
          <ActivityListField
            options={opts}
            value={activities}
            onChange={onActivitiesChange}
          />
        </div>
      )
    }

    default:
      return null
  }
}
