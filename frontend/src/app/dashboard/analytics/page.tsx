'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonKPI, SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import {
    getAllDesignersPerformance,
    getMyPerformance,
    getOverdueTasks,
    getAtRiskTasks,
    getStuckTasks,
    getDesignerLoad,
    DesignerPerformance,
    MyPerformance,
    TaskRisk,
    DesignerLoad,
} from '@/lib/analytics'
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Clock,
    Users,
    Target,
    CheckCircle2,
    BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
    const { isAdmin, isDesigner } = useAuth()
    const { showToast } = useToast()

    const [loading, setLoading] = useState(true)
    const [designersPerformance, setDesignersPerformance] = useState<DesignerPerformance[]>([])
    const [myPerformance, setMyPerformance] = useState<MyPerformance | null>(null)
    const [overdueTasks, setOverdueTasks] = useState<TaskRisk[]>([])
    const [atRiskTasks, setAtRiskTasks] = useState<TaskRisk[]>([])
    const [stuckTasks, setStuckTasks] = useState<TaskRisk[]>([])
    const [designerLoad, setDesignerLoad] = useState<DesignerLoad[]>([])

    useEffect(() => {
        loadData()
    }, [isAdmin, isDesigner])

    const loadData = async () => {
        setLoading(true)
        try {
            if (isAdmin) {
                const [perf, overdue, atRisk, stuck, load] = await Promise.all([
                    getAllDesignersPerformance(),
                    getOverdueTasks(),
                    getAtRiskTasks(3),
                    getStuckTasks(5),
                    getDesignerLoad(5),
                ])
                setDesignersPerformance(perf)
                setOverdueTasks(overdue)
                setAtRiskTasks(atRisk)
                setStuckTasks(stuck)
                setDesignerLoad(load)
            } else {
                const myPerf = await getMyPerformance()
                setMyPerformance(myPerf)
            }
        } catch (err) {
            console.error('Failed to load analytics:', err)
            showToast('error', 'Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    // Designer view
    if (isDesigner && !isAdmin) {
        return (
            <>
                <TopBar title="My Performance" subtitle="Track your progress" />
                <main className="px-6 lg:px-10 py-8">
                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
                        </div>
                    ) : myPerformance ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Tasks"
                                value={myPerformance.total}
                                icon={<Target className="w-5 h-5" />}
                                color="blue"
                            />
                            <StatCard
                                title="Completed"
                                value={myPerformance.completed}
                                icon={<CheckCircle2 className="w-5 h-5" />}
                                color="emerald"
                            />
                            <StatCard
                                title="Pending"
                                value={myPerformance.pending}
                                icon={<Clock className="w-5 h-5" />}
                                color="amber"
                            />
                            <StatCard
                                title="Completion Rate"
                                value={`${Math.round(myPerformance.completion_rate > 1 ? myPerformance.completion_rate : myPerformance.completion_rate * 100)}%`}
                                icon={<TrendingUp className="w-5 h-5" />}
                                color={(myPerformance.completion_rate > 1 ? myPerformance.completion_rate : myPerformance.completion_rate * 100) >= 70 ? 'emerald' : 'amber'}
                            />
                        </div>
                    ) : (
                        <EmptyState type="analytics" />
                    )}
                </main>
            </>
        )
    }

    // Admin view
    return (
        <>
            <TopBar title="Analytics" subtitle="Performance and bottleneck insights" />

            <main className="px-6 lg:px-10 py-8 space-y-8">
                {/* Bottleneck Alerts */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <SkeletonKPI key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AlertCard
                            title="Overdue Tasks"
                            count={overdueTasks.length}
                            tasks={overdueTasks}
                            type="danger"
                            icon={<AlertTriangle className="w-5 h-5" />}
                        />
                        <AlertCard
                            title="At Risk (< 3 days)"
                            count={atRiskTasks.length}
                            tasks={atRiskTasks}
                            type="warning"
                            icon={<Clock className="w-5 h-5" />}
                        />
                        <AlertCard
                            title="Stuck Tasks (> 5 days)"
                            count={stuckTasks.length}
                            tasks={stuckTasks}
                            type="info"
                            icon={<Clock className="w-5 h-5" />}
                        />
                    </div>
                )}

                {/* Overloaded Designers */}
                {designerLoad.length > 0 && (
                    <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-amber-500" />
                                <h3 className="font-semibold text-zinc-900">Overloaded Designers</h3>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {designerLoad.map((designer, index) => (
                                    <div
                                        key={designer.designer_id}
                                        className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100"
                                    >
                                        <Avatar name={`Designer ${index + 1}`} size="sm" />
                                        <span className="text-sm font-medium text-zinc-700">
                                            Designer {index + 1}
                                        </span>
                                        <Badge variant="working">{designer.active_tasks} tasks</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Designer Performance Table */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-semibold text-zinc-900">Designer Performance</h3>
                            </div>
                        </div>

                        {loading ? (
                            <SkeletonTable rows={4} />
                        ) : designersPerformance.length === 0 ? (
                            <EmptyState type="analytics" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-100">
                                            <th className="text-left py-3 px-4 font-medium text-zinc-500">Designer</th>
                                            <th className="text-center py-3 px-4 font-medium text-zinc-500">Total</th>
                                            <th className="text-center py-3 px-4 font-medium text-zinc-500">Completed</th>
                                            <th className="text-center py-3 px-4 font-medium text-zinc-500">Pending</th>
                                            <th className="text-center py-3 px-4 font-medium text-zinc-500">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {designersPerformance.map((designer, i) => {
                                            // Handle rate - if > 1, it's already a percentage
                                            const ratePercent = designer.completion_rate > 1
                                                ? designer.completion_rate
                                                : designer.completion_rate * 100
                                            const rateDecimal = ratePercent / 100

                                            return (
                                                <tr
                                                    key={designer.designer_id}
                                                    className="hover:bg-zinc-50/50 transition animate-fade-in"
                                                    style={{ animationDelay: `${i * 30}ms` }}
                                                >
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={`Designer ${i + 1}`} size="sm" />
                                                            <span className="font-medium text-zinc-900">
                                                                Designer {i + 1}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-center text-zinc-700">
                                                        {designer.total}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className="text-emerald-600 font-medium">{designer.completed}</span>
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className="text-amber-600">{designer.pending}</span>
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        'h-full rounded-full transition-all',
                                                                        ratePercent >= 70 ? 'bg-emerald-500' :
                                                                            ratePercent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                                                    )}
                                                                    style={{ width: `${Math.min(ratePercent, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium text-zinc-700">
                                                                {Math.round(ratePercent)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </>
    )
}

function StatCard({
    title,
    value,
    icon,
    color,
}: {
    title: string
    value: number | string
    icon: React.ReactNode
    color: 'emerald' | 'blue' | 'amber' | 'purple'
}) {
    const bgColors = {
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
        amber: 'bg-amber-100 text-amber-600',
        purple: 'bg-purple-100 text-purple-600',
    }

    return (
        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-zinc-500">{title}</span>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColors[color])}>
                        {icon}
                    </div>
                </div>
                <span className="text-3xl font-bold text-zinc-900">{value}</span>
            </CardContent>
        </Card>
    )
}

function AlertCard({
    title,
    count,
    tasks,
    type,
    icon,
}: {
    title: string
    count: number
    tasks: TaskRisk[]
    type: 'danger' | 'warning' | 'info'
    icon: React.ReactNode
}) {
    const styles = {
        danger: 'border-red-200 bg-red-50',
        warning: 'border-amber-200 bg-amber-50',
        info: 'border-blue-200 bg-blue-50',
    }

    const iconStyles = {
        danger: 'bg-red-100 text-red-600',
        warning: 'bg-amber-100 text-amber-600',
        info: 'bg-blue-100 text-blue-600',
    }

    return (
        <Card className={cn('rounded-2xl border', styles[type])}>
            <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconStyles[type])}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-900">{title}</h3>
                        <p className="text-2xl font-bold text-zinc-900">{count}</p>
                    </div>
                </div>

                {tasks.length > 0 && (
                    <div className="space-y-2 mt-4">
                        {tasks.slice(0, 3).map((task) => (
                            <Link
                                key={task.task_id}
                                href={`/dashboard/tasks/${task.task_id}`}
                                className="block p-2 bg-white/60 rounded-lg hover:bg-white transition text-sm"
                            >
                                <p className="font-medium text-zinc-700 truncate">{task.title}</p>
                                {task.days_remaining != null && (
                                    <p className="text-xs text-zinc-500">
                                        {task.days_remaining < 0
                                            ? `${Math.abs(task.days_remaining)} days overdue`
                                            : `${task.days_remaining} days left`}
                                    </p>
                                )}
                            </Link>
                        ))}
                        {tasks.length > 3 && (
                            <p className="text-xs text-zinc-500 text-center">
                                +{tasks.length - 3} more
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
