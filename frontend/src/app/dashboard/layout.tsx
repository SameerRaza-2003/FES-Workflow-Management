'use client'

import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f6f7fb] flex">
      <Sidebar />
      <div className="flex-1">{children}</div>
    </div>
  )
}
