'use client'

import { useEffect, useState, useRef } from 'react'
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
    uploadToTask,
    adminApproveTask,
    adminRequestChanges,
    finalApproveTask,
    approverRequestChanges,
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
    Upload,
    Image as ImageIcon,
    Loader2,
    X,
    Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { uploadImage } from '@/lib/upload'
import { summarizeComments } from '@/lib/ai'

export default function TaskDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { isAdmin, isDesigner, user } = useAuth()
    const isApprover = user?.role === 'approver'
    const { showToast } = useToast()

    const taskId = params.taskId as string

    const [task, setTask] = useState<Task | null>(null)
    const [comments, setComments] = useState<TaskComment[]>([])
    const [history, setHistory] = useState<TaskHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details')

    const [newComment, setNewComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // AI summary state
    const [aiSummary, setAiSummary] = useState('')
    const [summarizing, setSummarizing] = useState(false)

    const handleSummarize = async () => {
        if (comments.length < 2) return
        setSummarizing(true)
        try {
            const result = await summarizeComments({
                comments: comments.map(c => ({
                    author: c.author_name || c.author_id,
                    role: c.author_role,
                    content: c.content,
                })),
                task_title: task?.title || '',
            })
            setAiSummary(result)
        } catch (err: any) {
            setAiSummary('')
        } finally {
            setSummarizing(false)
        }
    }
    const [showChangesModal, setShowChangesModal] = useState(false)
    const [changesComment, setChangesComment] = useState('')

    // Designer upload state
    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [designerUploadUrl, setDesignerUploadUrl] = useState('')
    const [uploadingDesignerImage, setUploadingDesignerImage] = useState(false)
    const designerFileRef = useRef<HTMLInputElement>(null)

    // Image preview lightbox
    const [previewImage, setPreviewImage] = useState<string | null>(null)

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

    const handleCompleteTask = async (uploadUrl?: string) => {
        try {
            const updated = await completeTask(taskId, uploadUrl || undefined)
            setTask(updated)
            setShowCompleteModal(false)
            setDesignerUploadUrl('')
            showToast('success', 'Task marked as complete')
            loadTask()
        } catch (err) {
            showToast('error', 'Failed to complete task')
        }
    }

    const handleDesignerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingDesignerImage(true)
        try {
            const result = await uploadImage(file)
            setDesignerUploadUrl(result.url)
        } catch (err) {
            showToast('error', 'Image upload failed')
        } finally {
            setUploadingDesignerImage(false)
            if (designerFileRef.current) designerFileRef.current.value = ''
        }
    }

    const handleStandaloneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingDesignerImage(true)
        try {
            const result = await uploadImage(file)
            const updated = await uploadToTask(taskId, result.url)
            setTask(updated)
            showToast('success', 'Image uploaded successfully')
            loadTask()
        } catch (err) {
            showToast('error', 'Upload failed')
        } finally {
            setUploadingDesignerImage(false)
            if (designerFileRef.current) designerFileRef.current.value = ''
        }
    }

    const handleApproveTask = async () => {
        try {
            if (isAdmin) {
                const updated = await adminApproveTask(taskId)
                setTask(updated)
                showToast('success', 'Task approved - sent to Approver for final review')
            } else if (isApprover) {
                const updated = await finalApproveTask(taskId)
                setTask(updated)
                showToast('success', 'Task fully approved!')
            }
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
            if (isAdmin) {
                const updated = await adminRequestChanges(taskId, changesComment)
                setTask(updated)
            } else if (isApprover) {
                const updated = await approverRequestChanges(taskId, changesComment)
                setTask(updated)
            }
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
    const canAdminApprove = isAdmin && task.design_status === 'Completed' && task.approval_status === 'Pending'
    const canFinalApprove = isApprover && task.approval_status === 'AdminApproved'

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
                                <Button onClick={() => setShowCompleteModal(true)} className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Mark Complete
                                </Button>
                            )}
                            {(canAdminApprove || canFinalApprove) && (
                                <>
                                    <Button onClick={handleApproveTask} className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {canAdminApprove ? 'Approve' : 'Final Approve'}
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
                                                    <Avatar name={task.designer_name || task.designer_id} size="sm" />
                                                    {task.designer_name || 'Designer'}
                                                </>
                                            ) : (
                                                <span className="text-zinc-400 italic">Unassigned</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Assigned By</label>
                                        <p className="mt-1 text-zinc-900 flex items-center gap-2">
                                            <Avatar name={task.assigned_by_name || task.assigned_by_id} size="sm" />
                                            {task.assigned_by_name || 'Admin'}
                                        </p>
                                    </div>
                                    {task.content_for && (
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Content For</label>
                                            <p className="mt-1 text-zinc-900">{task.content_for}</p>
                                        </div>
                                    )}
                                    {task.is_urgent && (
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Priority</label>
                                            <p className="mt-1 text-orange-600 font-medium">🔥 Urgent</p>
                                        </div>
                                    )}
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

                                {/* Reference Images */}
                                {task.reference_images && task.reference_images.length > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Reference Images</label>
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            {task.reference_images.map((url, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setPreviewImage(url)}
                                                    className="rounded-lg overflow-hidden border border-zinc-200 w-24 h-24 hover:ring-2 hover:ring-emerald-400 transition-all"
                                                >
                                                    <img src={url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Designer Uploads History */}
                                {task.designer_uploads && task.designer_uploads.length > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Designer Uploads</label>
                                        <div className="mt-2 space-y-3">
                                            {[...task.designer_uploads].reverse().map((upload, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                                                    <button
                                                        onClick={() => setPreviewImage(upload.url)}
                                                        className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 flex-shrink-0 hover:ring-2 hover:ring-emerald-400 transition-all"
                                                    >
                                                        <img src={upload.url} alt={`Rev ${upload.revision}`} className="w-full h-full object-cover" />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-zinc-900">Revision {upload.revision}</p>
                                                        <p className="text-xs text-zinc-500">
                                                            {new Date(upload.uploaded_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <Badge variant={i === 0 ? 'completed' : 'default'} className="flex-shrink-0">
                                                        {i === 0 ? 'Latest' : `Rev ${upload.revision}`}
                                                    </Badge>
                                                </div>
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
                                {/* AI Summary */}
                                {comments.length >= 2 && (
                                    <div className="mb-4">
                                        <button
                                            onClick={handleSummarize}
                                            disabled={summarizing}
                                            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-all mb-3"
                                        >
                                            {summarizing ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5" />
                                            )}
                                            {summarizing ? 'Summarizing...' : '✨ Summarize'}
                                        </button>
                                        {aiSummary && (
                                            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50 rounded-xl mb-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    AI Summary
                                                </div>
                                                <div className="text-sm text-zinc-700 whitespace-pre-wrap">{aiSummary}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-4 mb-6">
                                    {comments.length === 0 ? (
                                        <p className="text-zinc-500 text-center py-8">No comments yet</p>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <Avatar name={comment.author_name || comment.author_id} size="sm" />
                                                <div className="flex-1 bg-zinc-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-zinc-900 text-sm">
                                                            {comment.author_name || comment.author_id}
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
                                                            <span className="font-medium">{entry.performed_by_name || entry.performed_by}</span>
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

            {/* Designer Complete + Upload Modal */}
            <Modal
                isOpen={showCompleteModal}
                onClose={() => { setShowCompleteModal(false); setDesignerUploadUrl('') }}
                title="Complete Task"
                description="Optionally upload your finished work before marking complete."
            >
                <div className="space-y-4">
                    <div
                        onClick={() => !uploadingDesignerImage && designerFileRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                            uploadingDesignerImage
                                ? "border-emerald-300 bg-emerald-50/50 cursor-wait"
                                : "border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/30"
                        )}
                    >
                        <input
                            ref={designerFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleDesignerFileSelect}
                        />
                        {uploadingDesignerImage ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                <p className="text-sm text-emerald-600 font-medium">Uploading...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-zinc-400" />
                                <p className="text-sm text-zinc-500">Click to upload your work (optional)</p>
                            </div>
                        )}
                    </div>

                    {designerUploadUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-zinc-200 w-full max-w-[200px] h-[200px] mx-auto group">
                            <img src={designerUploadUrl} alt="Upload preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setDesignerUploadUrl('')}
                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button variant="outline" onClick={() => { setShowCompleteModal(false); setDesignerUploadUrl('') }} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleCompleteTask(designerUploadUrl || undefined)}
                        disabled={uploadingDesignerImage}
                        className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    >
                        {designerUploadUrl ? 'Complete with Upload' : 'Complete without Upload'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Image Preview Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-3 -right-3 p-1.5 bg-white rounded-full shadow-lg text-zinc-600 hover:text-zinc-900 z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] rounded-xl object-contain"
                        />
                    </div>
                </div>
            )}
        </>
    )
}
