'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import KPISection from '@/components/dashboard/KPISection'
import TaskOverview from '@/components/dashboard/TaskOverview'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { getDashboardStats, DashboardStats } from '@/lib/dashboard'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    // 🔐 Guard: only fetch if token exists
    const token = localStorage.getItem('access_token')

    if (!token) {
      setUnauthorized(true)
      setLoading(false)
      return
    }

    getDashboardStats()
      .then(setStats)
      .catch((err) => {
        if (err?.response?.status === 401) {
          setUnauthorized(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <TopBar title="Dashboard" />

      <main className="px-10 py-10 space-y-10">

        {/* Unauthorized state */}
        {unauthorized && (
          <div className="text-sm text-red-500">
            You are not authorized. Please log in again.
          </div>
        )}

        {/* Loading */}
        {loading && !unauthorized && (
          <div className="text-sm text-zinc-500">
            Loading dashboard…
          </div>
        )}

        {/* Data loaded */}
        {!loading && !unauthorized && (
          <>
            <KPISection stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaskOverview />
              <RecentActivity />
            </div>
          </>
        )}

      </main>
    </>
  )
}
