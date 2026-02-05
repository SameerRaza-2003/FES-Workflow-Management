type Props = {
  status: string
}

const styles: Record<string, string> = {
  Pending: 'bg-zinc-100 text-zinc-700',
  Working: 'bg-sky-100 text-sky-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  ChangesRequired: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
}

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`
        inline-flex items-center
        rounded-full px-3 py-1
        text-xs font-medium
        ${styles[status] || 'bg-zinc-100 text-zinc-600'}
      `}
    >
      {status}
    </span>
  )
}
