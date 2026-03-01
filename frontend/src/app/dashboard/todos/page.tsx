'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { SkeletonKPI } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
    Plus,
    CheckCircle2,
    Circle,
    Clock,
    AlertTriangle,
    Trash2,
    Calendar,
    ChevronDown,
    ChevronUp,
    Loader2,
    Flag,
    PlayCircle,
    Eye,
    Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Todo,
    TodoCreate,
    createTodo,
    getTodos,
    updateTodo,
    deleteTodo,
} from '@/lib/todos'
import { getAllUsers, User } from '@/lib/users'

const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
}

const priorityIcons: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🔵',
}

function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(todo: Todo): boolean {
    if (!todo.due_date || todo.status === 'done') return false
    return new Date(todo.due_date) < new Date(new Date().toDateString())
}

function isToday(dateStr?: string): boolean {
    if (!dateStr) return false
    const d = new Date(dateStr).toDateString()
    return d === new Date().toDateString()
}

export default function TodosPage() {
    const { isAdmin, user } = useAuth()
    const { showToast } = useToast()

    const [todos, setTodos] = useState<Todo[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)
    const [filterPriority, setFilterPriority] = useState<string>('')
    const [creating, setCreating] = useState(false)
    const [allUsers, setAllUsers] = useState<User[]>([])

    // Form
    const [newTitle, setNewTitle] = useState('')
    const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [newDueDate, setNewDueDate] = useState('')
    const [newAssignedTo, setNewAssignedTo] = useState<string[]>([])
    const [newVisibleToAll, setNewVisibleToAll] = useState(false)

    useEffect(() => {
        loadTodos()
        if (isAdmin) {
            getAllUsers().then(setAllUsers).catch(() => { })
        }
    }, [isAdmin])

    const loadTodos = async () => {
        setLoading(true)
        try {
            const data = await getTodos()
            setTodos(data)
        } catch (err) {
            showToast('error', 'Failed to load todos')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newTitle.trim()) return
        setCreating(true)
        try {
            const payload: TodoCreate = {
                title: newTitle.trim(),
                priority: newPriority,
                due_date: newDueDate || undefined,
                assigned_to: newAssignedTo,
                visible_to_all: newVisibleToAll,
            }
            const created = await createTodo(payload)
            setTodos(prev => [created, ...prev])
            setShowModal(false)
            resetForm()
            showToast('success', 'Todo created!')
        } catch (err) {
            showToast('error', 'Failed to create todo')
        } finally {
            setCreating(false)
        }
    }

    const resetForm = () => {
        setNewTitle('')
        setNewPriority('medium')
        setNewDueDate('')
        setNewAssignedTo([])
        setNewVisibleToAll(false)
    }

    const toggleStatus = async (todo: Todo) => {
        const nextStatus = todo.status === 'done' ? 'todo' : todo.status === 'todo' ? 'in_progress' : 'done'
        try {
            const updated = await updateTodo(todo.id, { status: nextStatus })
            setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
        } catch {
            showToast('error', 'Failed to update')
        }
    }

    const toggleVisibility = async (todo: Todo) => {
        try {
            const updated = await updateTodo(todo.id, { visible_to_all: !todo.visible_to_all } as any)
            setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
            showToast('success', todo.visible_to_all ? 'Hidden from team' : 'Now visible to team')
        } catch {
            showToast('error', 'Failed to update visibility')
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteTodo(id)
            setTodos(prev => prev.filter(t => t.id !== id))
            showToast('success', 'Todo deleted')
        } catch {
            showToast('error', 'Failed to delete')
        }
    }

    const toggleAssignee = (userId: string) => {
        setNewAssignedTo(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        )
    }

    // Find user names for display
    const getUserName = (userId: string) => {
        const u = allUsers.find(u => u.id === userId)
        return u?.full_name || userId.slice(0, 6)
    }

    // Split todos into sections
    const activeTodos = todos.filter(t => t.status !== 'done')
    const completedTodos = todos.filter(t => t.status === 'done')
    const overdueTodos = activeTodos.filter(t => isOverdue(t))
    const todayTodos = activeTodos.filter(t => isToday(t.due_date) && !isOverdue(t))
    const upcomingTodos = activeTodos.filter(t => !isOverdue(t) && !isToday(t.due_date) && t.due_date)
    const noDueTodos = activeTodos.filter(t => !t.due_date)

    const filteredFn = (list: Todo[]) =>
        filterPriority ? list.filter(t => t.priority === filterPriority) : list

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === 'done') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        if (status === 'in_progress') return <PlayCircle className="w-5 h-5 text-amber-500" />
        return <Circle className="w-5 h-5 text-zinc-300" />
    }

    const isOwner = (todo: Todo) => todo.created_by === user?.id

    const TodoCard = ({ todo }: { todo: Todo }) => (
        <div
            className={cn(
                'flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-sm group',
                todo.status === 'done'
                    ? 'bg-zinc-50/50 border-zinc-100'
                    : isOverdue(todo)
                        ? 'bg-red-50/30 border-red-200/50'
                        : 'bg-white border-zinc-200/60'
            )}
        >
            <button onClick={() => toggleStatus(todo)} className="mt-0.5 hover:scale-110 transition">
                <StatusIcon status={todo.status} />
            </button>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-sm font-medium',
                    todo.status === 'done' ? 'line-through text-zinc-400' : 'text-zinc-900'
                )}>
                    {todo.title}
                </p>
                {todo.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{todo.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                        priorityColors[todo.priority]
                    )}>
                        {todo.priority}
                    </span>
                    {todo.due_date && (
                        <span className={cn(
                            'text-[11px] flex items-center gap-1',
                            isOverdue(todo) ? 'text-red-500 font-medium' : 'text-zinc-400'
                        )}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(todo.due_date)}
                        </span>
                    )}
                    {todo.assigned_to.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {todo.assigned_to.length} assigned
                        </span>
                    )}
                    {todo.visible_to_all && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Team
                        </span>
                    )}
                    {todo.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                {isOwner(todo) && (
                    <button
                        onClick={() => toggleVisibility(todo)}
                        title={todo.visible_to_all ? 'Hide from team' : 'Show to team'}
                        className={cn(
                            'p-1 rounded-md transition',
                            todo.visible_to_all
                                ? 'text-emerald-500 hover:bg-emerald-50'
                                : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500'
                        )}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={() => handleDelete(todo.id)}
                    className="text-zinc-300 hover:text-red-500 p-1 rounded-md transition"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )

    const Section = ({ title, icon, items, color }: {
        title: string; icon: React.ReactNode; items: Todo[]; color: string
    }) => {
        const filtered = filteredFn(items)
        if (filtered.length === 0) return null
        return (
            <div>
                <div className={cn('flex items-center gap-2 text-sm font-semibold mb-3', color)}>
                    {icon}
                    {title}
                    <span className="text-xs font-normal ml-1 opacity-60">({filtered.length})</span>
                </div>
                <div className="space-y-2">
                    {filtered.map(todo => <TodoCard key={todo.id} todo={todo} />)}
                </div>
            </div>
        )
    }

    return (
        <>
            <TopBar title="To-Dos" subtitle="Manage your tasks & reminders" />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Top Bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            {['', 'high', 'medium', 'low'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setFilterPriority(p)}
                                    className={cn(
                                        'px-3 py-1.5 text-xs font-medium rounded-full transition-all',
                                        filterPriority === p
                                            ? 'bg-zinc-900 text-white'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    )}
                                >
                                    {p ? `${priorityIcons[p]} ${p.charAt(0).toUpperCase() + p.slice(1)}` : 'All'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Todo
                        </button>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
                        </div>
                    ) : todos.length === 0 ? (
                        <EmptyState type="tasks" />
                    ) : (
                        <div className="space-y-8">
                            <Section
                                title="Overdue"
                                icon={<AlertTriangle className="w-4 h-4" />}
                                items={overdueTodos}
                                color="text-red-600"
                            />
                            <Section
                                title="Today"
                                icon={<Clock className="w-4 h-4" />}
                                items={todayTodos}
                                color="text-emerald-600"
                            />
                            <Section
                                title="Upcoming"
                                icon={<Calendar className="w-4 h-4" />}
                                items={upcomingTodos}
                                color="text-blue-600"
                            />
                            <Section
                                title="No Due Date"
                                icon={<Flag className="w-4 h-4" />}
                                items={noDueTodos}
                                color="text-zinc-500"
                            />

                            {/* Completed (collapsible) */}
                            {completedTodos.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowCompleted(!showCompleted)}
                                        className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-zinc-600 transition mb-3"
                                    >
                                        {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        Completed ({completedTodos.length})
                                    </button>
                                    {showCompleted && (
                                        <div className="space-y-2">
                                            {filteredFn(completedTodos).map(todo => (
                                                <TodoCard key={todo.id} todo={todo} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 animate-fade-in">
                        <h2 className="text-lg font-semibold text-zinc-900">New Todo</h2>

                        <input
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            autoFocus
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">Priority</label>
                                <select
                                    value={newPriority}
                                    onChange={e => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                >
                                    <option value="low">🔵 Low</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="high">🔴 High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">Due Date</label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={e => setNewDueDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                />
                            </div>
                        </div>

                        {/* Assign To (admin only) */}
                        {isAdmin && allUsers.length > 0 && (
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-2 block">
                                    Assign to (optional)
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-zinc-200 rounded-xl">
                                    {allUsers
                                        .filter(u => u.id !== user?.id)
                                        .map(u => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => toggleAssignee(u.id)}
                                                className={cn(
                                                    'px-3 py-1.5 text-xs rounded-full border transition-all',
                                                    newAssignedTo.includes(u.id)
                                                        ? 'bg-indigo-500 text-white border-indigo-500'
                                                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300'
                                                )}
                                            >
                                                {u.full_name}
                                                <span className="ml-1 opacity-60 capitalize">({u.role})</span>
                                            </button>
                                        ))}
                                </div>
                                {newAssignedTo.length > 0 && (
                                    <p className="text-[11px] text-indigo-500 mt-1">
                                        {newAssignedTo.length} user{newAssignedTo.length > 1 ? 's' : ''} will be notified
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Show to others toggle */}
                        <div className="flex items-center justify-between py-2 px-1">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-zinc-400" />
                                <div>
                                    <p className="text-sm font-medium text-zinc-700">Show to team</p>
                                    <p className="text-[11px] text-zinc-400">Make this visible to everyone</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNewVisibleToAll(!newVisibleToAll)}
                                className={cn(
                                    'relative w-10 h-6 rounded-full transition-colors',
                                    newVisibleToAll ? 'bg-emerald-500' : 'bg-zinc-200'
                                )}
                            >
                                <span
                                    className={cn(
                                        'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                        newVisibleToAll && 'translate-x-4'
                                    )}
                                />
                            </button>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => { setShowModal(false); resetForm() }}
                                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newTitle.trim()}
                                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
