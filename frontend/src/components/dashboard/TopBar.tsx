'use client'

export default function TopBar({ title }: { title: string }) {
  return (
    <div className="
      h-16
      flex items-center justify-between
      px-8
      border-b border-zinc-200/70
      bg-white
    ">
      <h1 className="text-lg font-semibold text-zinc-900">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">
          Admin
        </span>
        <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">
          A
        </div>
      </div>
    </div>
  )
}
