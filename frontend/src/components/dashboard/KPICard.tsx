type Props = {
  label: string
  value?: number
}

export default function KPICard({ label, value }: Props) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        bg-white/80
        backdrop-blur-xl
        border border-zinc-200/60
        p-6
        shadow-[0_10px_30px_rgba(0,0,0,0.04)]
      "
    >
      {/* top accent — FIXED */}
      <div className="absolute top-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-emerald-400/40 to-sky-400/40" />

      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold text-zinc-900 tracking-tight">
        {value ?? '—'}
      </p>
    </div>
  )
}
