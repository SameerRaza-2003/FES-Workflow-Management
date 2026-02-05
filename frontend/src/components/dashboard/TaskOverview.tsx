'use client'

import { Card, CardContent } from '@/components/ui/card'

interface TaskOverviewProps {
  total: number
  working: number
  pending: number
  completed: number
}

export default function TaskOverview({ total, working, pending, completed }: TaskOverviewProps) {
  const segments = [
    { label: 'In Progress', value: working, color: 'bg-amber-500' },
    { label: 'Pending Approval', value: pending, color: 'bg-purple-500' },
    { label: 'Completed', value: completed, color: 'bg-emerald-500' },
  ]

  const getWidth = (value: number) => {
    if (total === 0) return 0
    return (value / total) * 100
  }

  return (
    <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-zinc-900">Task Overview</h3>
          <span className="text-sm text-zinc-500">{total} total tasks</span>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-zinc-100 rounded-full overflow-hidden flex">
          {segments.map((segment, i) => (
            <div
              key={segment.label}
              className={`${segment.color} transition-all duration-500`}
              style={{ width: `${getWidth(segment.value)}%` }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {segments.map((segment) => (
            <div key={segment.label} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${segment.color}`} />
                <span className="text-2xl font-bold text-zinc-900">{segment.value}</span>
              </div>
              <p className="text-xs text-zinc-500">{segment.label}</p>
            </div>
          ))}
        </div>

        {/* Distribution percentages */}
        {total > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              {segments.map((segment) => (
                <div key={segment.label}>
                  <span className="text-sm font-medium text-zinc-700">
                    {Math.round(getWidth(segment.value))}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
