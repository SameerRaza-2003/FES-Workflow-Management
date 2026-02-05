'use client'

import Link from 'next/link'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Tasks', href: '/dashboard/tasks' },
  { label: 'Approvals', href: '/dashboard/approvals' },
  { label: 'Analytics', href: '/dashboard/analytics' },
]

export default function Sidebar() {
  return (
    <aside className="
      w-64
      bg-white/80
      backdrop-blur-xl
      border-r border-zinc-200/60
      px-6
      py-8
      hidden lg:flex
      flex-col
    ">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-12">
        <img
          src="/logo.png"
          alt="FES Workflow"
          className="h-9 w-auto object-contain"
        />
        <span className="font-semibold text-zinc-900">
          FES Workflow
        </span>
      </div>

      {/* Nav */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="
              block rounded-xl px-4 py-2.5
              text-sm text-zinc-600
              hover:bg-emerald-50
              hover:text-emerald-700
              transition
            "
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      <p className="text-xs text-zinc-400">
        © 2026 FES
      </p>
    </aside>
  )
}
