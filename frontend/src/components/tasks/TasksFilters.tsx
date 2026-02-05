'use client'

interface Props {
  designStatus: string | null
  approvalStatus: string | null
  onDesignStatusChange: (v: string | null) => void
  onApprovalStatusChange: (v: string | null) => void
}

const DESIGN_STATUSES = [
  'Pending',
  'Working',
  'Completed',
  'OnHold',
  'Discarded',
]

const APPROVAL_STATUSES = [
  'Pending',
  'Approved',
  'ChangesRequired',
  'Rejected',
]

export default function TasksFilters({
  designStatus,
  approvalStatus,
  onDesignStatusChange,
  onApprovalStatusChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4">

      {/* Design Status */}
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={designStatus === null}
          onClick={() => onDesignStatusChange(null)}
        >
          All
        </FilterButton>

        {DESIGN_STATUSES.map((s) => (
          <FilterButton
            key={s}
            active={designStatus === s}
            onClick={() => onDesignStatusChange(s)}
          >
            {s}
          </FilterButton>
        ))}
      </div>

      {/* Approval Status */}
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={approvalStatus === null}
          onClick={() => onApprovalStatusChange(null)}
        >
          All approvals
        </FilterButton>

        {APPROVAL_STATUSES.map((s) => (
          <FilterButton
            key={s}
            active={approvalStatus === s}
            onClick={() => onApprovalStatusChange(s)}
          >
            {s}
          </FilterButton>
        ))}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        rounded-full px-4 py-1.5 text-sm font-medium transition
        ${active
          ? 'bg-zinc-900 text-white'
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}
      `}
    >
      {children}
    </button>
  )
}
