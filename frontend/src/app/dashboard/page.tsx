'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import KPISection from '@/components/dashboard/KPISection'
import TaskOverview from '@/components/dashboard/TaskOverview'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { getDashboardStats, DashboardStats } from '@/lib/dashboard'
import { useAuth } from '@/contexts/AuthContext'
import { SkeletonKPI } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user, isAdmin, isDesigner } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    // Pass isDesigner flag to get role-appropriate stats
    getDashboardStats(isDesigner)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDesigner])

  const total = stats?.total_tasks ?? 0
  const working = stats?.in_progress ?? 0
  const pending = stats?.pending_approval ?? 0
  const completed = Math.max(total - working - pending, 0)

  return (
    <>
      <TopBar
        title={`Welcome back, ${user?.fullName?.split(' ')[0] || 'User'}`}
        subtitle="Here's what's happening with your tasks today"
      />

      <main className="px-6 lg:px-10 py-8 space-y-8">
        {/* Quick Actions */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/tasks">
              <Button className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 shadow-lg shadow-emerald-500/25">
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
            </Link>
            <Link href="/dashboard/import">
              <Button variant="outline" className="gap-2 rounded-xl">
                Import Tasks
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* KPI Section */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonKPI key={i} />
            ))}
          </div>
        ) : (
          <KPISection stats={stats} />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskOverview
            total={total}
            working={working}
            pending={pending}
            completed={completed}
          />
          <RecentActivity />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/tasks"
            className="p-5 bg-white rounded-2xl border border-zinc-200/50 shadow-soft hover-lift group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900">View All Tasks</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Manage and track all tasks
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {isAdmin && (
            <Link
              href="/dashboard/approvals"
              className="p-5 bg-white rounded-2xl border border-zinc-200/50 shadow-soft hover-lift group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">Approvals</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Review pending submissions
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/dashboard/analytics"
              className="p-5 bg-white rounded-2xl border border-zinc-200/50 shadow-soft hover-lift group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">Analytics</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Performance insights
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          )}
        </div>
      </main>
    </>
  )
}
