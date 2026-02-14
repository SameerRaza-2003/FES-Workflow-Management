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
    getAllAssignersPerformance,
    getMyPerformance,
    getOverdueTasks,
    getAtRiskTasks,
    getStuckTasks,
    getDesignerLoad,
    DesignerPerformance,
    AssignerPerformance,
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
    UserCheck,
    Award,
    Zap,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
    const { isAdmin, isDesigner } = useAuth()
    const { showToast } = useToast()

    const [loading, setLoading] = useState(true)
    const [designersPerformance, setDesignersPerformance] = useState<DesignerPerformance[]>([])
    const [assignersPerformance, setAssignersPerformance] = useState<AssignerPerformance[]>([])
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
                const [perf, assignerPerf, overdue, atRisk, stuck, load] = await Promise.all([
                    getAllDesignersPerformance(),
                    getAllAssignersPerformance(),
                    getOverdueTasks(),
                    getAtRiskTasks(3),
                    getStuckTasks(5),
                    getDesignerLoad(5),
                ])
                setDesignersPerformance(perf)
                setAssignersPerformance(assignerPerf)
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

    // Calculate totals for summary stats
    const totalTasks = designersPerformance.reduce((sum, d) => sum + d.total, 0)
    const totalCompleted = designersPerformance.reduce((sum, d) => sum + d.completed, 0)
    const overallCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

    const topDesigner = [...designersPerformance].sort((a, b) => b.completion_rate - a.completion_rate)[0]
    const topAssigner = [...assignersPerformance].sort((a, b) => b.approval_rate - a.approval_rate)[0]

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
            <TopBar title="Analytics" subtitle="Performance insights & comparisons" />

            <main className="px-6 lg:px-10 py-8 space-y-8">
                {/* Summary KPIs */}
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Tasks"
                            value={totalTasks}
                            icon={<Target className="w-5 h-5" />}
                            color="blue"
                        />
                        <StatCard
                            title="Completed"
                            value={totalCompleted}
                            icon={<CheckCircle2 className="w-5 h-5" />}
                            color="emerald"
                        />
                        <StatCard
                            title="Overall Completion"
                            value={`${overallCompletionRate}%`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color={overallCompletionRate >= 70 ? 'emerald' : overallCompletionRate >= 40 ? 'amber' : 'purple'}
                        />
                        <StatCard
                            title="Top Designer"
                            value={topDesigner?.designer_name || 'N/A'}
                            subtitle={topDesigner ? `${Math.round(topDesigner.completion_rate)}% rate` : undefined}
                            icon={<Award className="w-5 h-5" />}
                            color="purple"
                        />
                    </div>
                )}

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

                {/* Designer Performance Comparison - Bar Chart Style */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-semibold text-zinc-900">Designer Performance Comparison</h3>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                    Completed
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-amber-400"></div>
                                    Pending
                                </span>
                            </div>
                        </div>

                        {loading ? (
                            <SkeletonTable rows={4} />
                        ) : designersPerformance.length === 0 ? (
                            <EmptyState type="analytics" />
                        ) : (
                            <div className="space-y-4">
                                {designersPerformance
                                    .filter(d => d.designer_id !== 'unassigned')
                                    .sort((a, b) => b.total - a.total)
                                    .map((designer, i) => {
                                        const maxTotal = Math.max(...designersPerformance.map(d => d.total))
                                        const completedWidth = (designer.completed / maxTotal) * 100
                                        const pendingWidth = (designer.pending / maxTotal) * 100

                                        return (
                                            <div key={designer.designer_id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={designer.designer_name || `Designer ${i + 1}`} size="sm" />
                                                        <span className="font-medium text-zinc-900">
                                                            {designer.designer_name || `Designer ${i + 1}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="text-zinc-500">{designer.total} tasks</span>
                                                        <Badge variant={designer.completion_rate >= 70 ? 'approved' : designer.completion_rate >= 40 ? 'working' : 'pending'}>
                                                            {Math.round(designer.completion_rate)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-6 bg-zinc-100 rounded-lg overflow-hidden flex">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-500"
                                                        style={{ width: `${completedWidth}%` }}
                                                    />
                                                    <div
                                                        className="h-full bg-amber-400 transition-all duration-500"
                                                        style={{ width: `${pendingWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Assigner Performance Section */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold text-zinc-900">Assigner Performance</h3>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-purple-500"></div>
                                    Approved
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-blue-400"></div>
                                    Pending Approval
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-zinc-300"></div>
                                    In Progress
                                </span>
                            </div>
                        </div>

                        {loading ? (
                            <SkeletonTable rows={3} />
                        ) : assignersPerformance.length === 0 ? (
                            <EmptyState type="analytics" />
                        ) : (
                            <div className="space-y-4">
                                {assignersPerformance
                                    .sort((a, b) => b.total_assigned - a.total_assigned)
                                    .map((assigner, i) => {
                                        const maxTotal = Math.max(...assignersPerformance.map(a => a.total_assigned))
                                        const approvedWidth = (assigner.approved / maxTotal) * 100
                                        const pendingWidth = (assigner.pending_approval / maxTotal) * 100
                                        const inProgressWidth = (assigner.in_progress / maxTotal) * 100

                                        return (
                                            <div key={assigner.assigner_id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={assigner.assigner_name || `Assigner ${i + 1}`} size="sm" />
                                                        <span className="font-medium text-zinc-900">
                                                            {assigner.assigner_name || `Assigner ${i + 1}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="text-zinc-500">{assigner.total_assigned} assigned</span>
                                                        <Badge variant={assigner.approval_rate >= 70 ? 'approved' : assigner.approval_rate >= 40 ? 'working' : 'pending'}>
                                                            {Math.round(assigner.approval_rate)}% approved
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-6 bg-zinc-100 rounded-lg overflow-hidden flex">
                                                    <div
                                                        className="h-full bg-purple-500 transition-all duration-500"
                                                        style={{ width: `${approvedWidth}%` }}
                                                    />
                                                    <div
                                                        className="h-full bg-blue-400 transition-all duration-500"
                                                        style={{ width: `${pendingWidth}%` }}
                                                    />
                                                    <div
                                                        className="h-full bg-zinc-300 transition-all duration-500"
                                                        style={{ width: `${inProgressWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Designer Performance Table with Names */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-zinc-900">Designer Details</h3>
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
                                        {designersPerformance
                                            .filter(d => d.designer_id !== 'unassigned')
                                            .map((designer, i) => {
                                                const ratePercent = designer.completion_rate > 1
                                                    ? designer.completion_rate
                                                    : designer.completion_rate * 100

                                                return (
                                                    <tr
                                                        key={designer.designer_id}
                                                        className="hover:bg-zinc-50/50 transition animate-fade-in"
                                                        style={{ animationDelay: `${i * 30}ms` }}
                                                    >
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar name={designer.designer_name || `Designer ${i + 1}`} size="sm" />
                                                                <span className="font-medium text-zinc-900">
                                                                    {designer.designer_name || `Designer ${i + 1}`}
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

                {/* Overloaded Designers */}
                {designerLoad.length > 0 && (
                    <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-5 h-5 text-amber-500" />
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
            </main>
        </>
    )
}

function StatCard({
    title,
    value,
    subtitle,
    icon,
    color,
}: {
    title: string
    value: number | string
    subtitle?: string
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
                <span className="text-2xl font-bold text-zinc-900 block truncate">{value}</span>
                {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
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
