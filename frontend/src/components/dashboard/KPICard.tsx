'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: React.ReactNode
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose'
  className?: string
}

const colorStyles = {
  emerald: {
    bg: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    glow: 'shadow-emerald-500/25',
  },
  blue: {
    bg: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    glow: 'shadow-blue-500/25',
  },
  amber: {
    bg: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    glow: 'shadow-amber-500/25',
  },
  purple: {
    bg: 'from-purple-500 to-indigo-600',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    glow: 'shadow-purple-500/25',
  },
  rose: {
    bg: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    glow: 'shadow-rose-500/25',
  },
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'emerald',
  className,
}: KPICardProps) {
  const styles = colorStyles[color]

  return (
    <div
      className={cn(
        'relative p-6 bg-white rounded-2xl border border-zinc-200/50 shadow-soft hover-lift overflow-hidden group',
        className
      )}
    >
      {/* Background gradient accent */}
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity',
        `bg-gradient-to-br ${styles.bg}`
      )} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-zinc-500">
            {title}
          </span>
          {icon && (
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              styles.iconBg
            )}>
              <span className={styles.iconText}>
                {icon}
              </span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-zinc-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>

          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium mb-1',
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-zinc-500'
            )}>
              {trend === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4" />}
              {trend === 'neutral' && <Minus className="w-4 h-4" />}
              {trendValue}
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-2 text-sm text-zinc-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
