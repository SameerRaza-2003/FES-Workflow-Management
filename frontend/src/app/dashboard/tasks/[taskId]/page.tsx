'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, getDesignStatusVariant, getApprovalStatusVariant, getPostingStatusVariant } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import {
    Task,
    TaskComment,
    TaskHistory,
    getTask,
    getTaskComments,
    getTaskHistory,
    addTaskComment,
    startTask,
    completeTask,
    approveTask,
    requestChanges,
} from '@/lib/tasks'
import {
    ArrowLeft,
    Calendar,
    User,
    Tag,
    FileText,
    MessageSquare,
    History,
    Play,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function TaskDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { isAdmin, isDesigner, user } = useAuth()
    const { showToast } = useToast()

    const taskId = params.taskId as string

    const [task, setTask] = useState<Task | null>(null)
    const [comments, setComments] = useState<TaskComment[]>([])
    const [history, setHistory] = useState<TaskHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details')

    const [newComment, setNewComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const [showChangesModal, setShowChangesModal] = useState(false)
    const [changesComment, setChangesComment] = useState('')

    useEffect(() => {
        loadTask()
    }, [taskId])

    const loadTask = async () => {
        setLoading(true)
        try {
            const [taskData, commentsData, historyData] = await Promise.all([
                getTask(taskId),
                getTaskComments(taskId),
                getTaskHistory(taskId),
            ])
            setTask(taskData)
            setComments(commentsData)
            setHistory(historyData)
        } catch (err) {
            console.error('Failed to load task:', err)
            showToast('error', 'Failed to load task')
        } finally {
            setLoading(false)
        }
    }

    const handleAddComment = async () => {
        if (!newComment.trim()) return

        setSubmitting(true)
        try {
            const comment = await addTaskComment(taskId, newComment)
            setComments((prev) => [...prev, comment])
            setNewComment('')
            showToast('success', 'Comment added')
        } catch (err) {
            showToast('error', 'Failed to add comment')
        } finally {
            setSubmitting(false)
        }
    }

    const handleStartTask = async () => {
        try {
            const updated = await startTask(taskId)
            setTask(updated)
            showToast('success', 'Task started')
            loadTask() // Reload to get updated history
        } catch (err) {
            showToast('error', 'Failed to start task')
        }
    }

    const handleCompleteTask = async () => {
        try {
            const updated = await completeTask(taskId)
            setTask(updated)
            showToast('success', 'Task marked as complete')
            loadTask()
        } catch (err) {
            showToast('error', 'Failed to complete task')
        }
    }

    const handleApproveTask = async () => {
        try {
            const updated = await approveTask(taskId)
            setTask(updated)
            showToast('success', 'Task approved')
            loadTask()
        } catch (err) {
            showToast('error', 'Failed to approve task')
        }
    }

    const handleRequestChanges = async () => {
        if (!changesComment.trim()) {
            showToast('error', 'Please provide a comment')
            return
        }

        try {
            const updated = await requestChanges(taskId, changesComment)
            setTask(updated)
            setShowChangesModal(false)
            setChangesComment('')
            showToast('success', 'Changes requested')
            loadTask()
        } catch (err) {
            showToast('error', 'Failed to request changes')
        }
    }

    if (loading) {
        return (
            <>
                <TopBar title="Task Details" />
                <main className="px-6 lg:px-10 py-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </>
        )
    }

    if (!task) {
        return (
            <>
                <TopBar title="Task Not Found" />
                <main className="px-6 lg:px-10 py-8">
                    <div className="text-center py-16">
                        <p className="text-zinc-500">Task not found</p>
                        <Link href="/dashboard/tasks">
                            <Button className="mt-4">Back to Tasks</Button>
                        </Link>
                    </div>
                </main>
            </>
        )
    }

    const canStart = isDesigner && task.design_status === 'Pending' && task.designer_id
    const canComplete = isDesigner && task.design_status === 'Working'
    const canApprove = isAdmin && task.design_status === 'Completed' && task.approval_status === 'Pending'

    return (
        <>
            <TopBar title="Task Details" />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back Button */}
                    <Link
                        href="/dashboard/tasks"
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-6 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tasks
                    </Link>

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                                {task.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge variant={getDesignStatusVariant(task.design_status)} dot>
                                    {task.design_status}
                                </Badge>
                                <Badge variant={getApprovalStatusVariant(task.approval_status)}>
                                    {task.approval_status}
                                </Badge>
                                <Badge variant={getPostingStatusVariant(task.posting_status)}>
                                    {task.posting_status}
                                </Badge>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            {canStart && (
                                <Button onClick={handleStartTask} className="gap-2 rounded-xl">
                                    <Play className="w-4 h-4" />
                                    Start Task
                                </Button>
                            )}
                            {canComplete && (
                                <Button onClick={handleCompleteTask} className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Mark Complete
                                </Button>
                            )}
                            {canApprove && (
                                <>
                                    <Button onClick={handleApproveTask} className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        onClick={() => setShowChangesModal(true)}
                                        variant="outline"
                                        className="gap-2 rounded-xl text-amber-600 border-amber-300 hover:bg-amber-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Request Changes
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl mb-6 w-fit">
                        {[
                            { id: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
                            { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" />, count: comments.length },
                            { id: 'history', label: 'History', icon: <History className="w-4 h-4" />, count: history.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition',
                                    activeTab === tab.id
                                        ? 'bg-white text-zinc-900 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-zinc-200">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content Type</label>
                                        <p className="mt-1 text-zinc-900">{task.content_type}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Size</label>
                                        <p className="mt-1 text-zinc-900">{task.size || '—'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Deadline</label>
                                        <p className="mt-1 text-zinc-900 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-zinc-400" />
                                            {task.deadline ? new Date(task.deadline).toLocaleString() : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Assigned To</label>
                                        <p className="mt-1 text-zinc-900 flex items-center gap-2">
                                            {task.designer_id ? (
                                                <>
                                                    <Avatar name={task.designer_id} size="sm" />
                                                    {task.designer_id.split('@')[0]}
                                                </>
                                            ) : (
                                                <span className="text-zinc-400 italic">Unassigned</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {task.content && (
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content / Copy</label>
                                        <p className="mt-2 text-zinc-700 whitespace-pre-wrap bg-zinc-50 p-4 rounded-xl">
                                            {task.content}
                                        </p>
                                    </div>
                                )}

                                {task.instructions && (
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Instructions</label>
                                        <p className="mt-2 text-zinc-700 whitespace-pre-wrap bg-amber-50 p-4 rounded-xl border border-amber-100">
                                            {task.instructions}
                                        </p>
                                    </div>
                                )}

                                {task.tags && task.tags.length > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Tags</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {task.tags.map((tag) => (
                                                <span key={tag} className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-6">
                                <div className="space-y-4 mb-6">
                                    {comments.length === 0 ? (
                                        <p className="text-zinc-500 text-center py-8">No comments yet</p>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <Avatar name={comment.author_id} size="sm" />
                                                <div className="flex-1 bg-zinc-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-zinc-900 text-sm">
                                                            {comment.author_id.split('@')[0]}
                                                        </span>
                                                        <span className="text-xs text-zinc-400">
                                                            {comment.author_role}
                                                        </span>
                                                        <span className="text-xs text-zinc-400">
                                                            • {new Date(comment.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-zinc-700 text-sm">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Add Comment */}
                                <div className="flex gap-3">
                                    <Avatar name={user?.fullName || 'User'} size="sm" />
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add a comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        />
                                        <Button
                                            onClick={handleAddComment}
                                            disabled={submitting || !newComment.trim()}
                                            className="rounded-xl"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                            <CardContent className="p-6">
                                {history.length === 0 ? (
                                    <p className="text-zinc-500 text-center py-8">No history yet</p>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-200" />
                                        <div className="space-y-6">
                                            {history.map((entry, i) => (
                                                <div key={entry.id} className="relative flex gap-4 pl-10">
                                                    <div className={cn(
                                                        'absolute left-2 w-5 h-5 rounded-full border-2 border-white',
                                                        i === 0 ? 'bg-emerald-500' : 'bg-zinc-300'
                                                    )} />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-zinc-900">
                                                            <span className="font-medium">{entry.performed_by.split('@')[0]}</span>
                                                            {' '}
                                                            <span className="text-zinc-500">{entry.action}</span>
                                                        </p>
                                                        {entry.comment && (
                                                            <p className="text-sm text-zinc-600 mt-1 bg-zinc-50 p-2 rounded-lg">
                                                                "{entry.comment}"
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-zinc-400 mt-1">
                                                            {new Date(entry.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Request Changes Modal */}
            <Modal
                isOpen={showChangesModal}
                onClose={() => setShowChangesModal(false)}
                title="Request Changes"
                description="Provide feedback for the designer"
            >
                <textarea
                    placeholder="Describe what changes are needed..."
                    value={changesComment}
                    onChange={(e) => setChangesComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                />
                <ModalFooter>
                    <Button variant="outline" onClick={() => setShowChangesModal(false)} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button onClick={handleRequestChanges} className="rounded-xl bg-amber-500 hover:bg-amber-600">
                        Request Changes
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    )
}
