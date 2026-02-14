'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, getDesignStatusVariant } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import {
    Task,
    getPendingAdminApprovalTasks,
    getPendingFinalApprovalTasks,
    adminApproveTask,
    adminRequestChanges,
    finalApproveTask,
    approverRequestChanges,
} from '@/lib/tasks'
import {
    CheckCircle2,
    XCircle,
    Eye,
    Calendar,
    Clock,
    Flame,
    Image as ImageIcon,
    X,
} from 'lucide-react'
import Link from 'next/link'

export default function ApprovalsPage() {
    const { showToast } = useToast()
    const { user, isAdmin } = useAuth()
    const isApprover = user?.role === 'approver'

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [showChangesModal, setShowChangesModal] = useState(false)
    const [changesComment, setChangesComment] = useState('')
    const [processing, setProcessing] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    useEffect(() => {
        loadTasks()
    }, [isAdmin, isApprover])

    const loadTasks = async () => {
        setLoading(true)
        try {
            // Role-based queue selection
            if (isAdmin) {
                // Admin: Layer 1 - tasks awaiting admin approval
                const data = await getPendingAdminApprovalTasks()
                setTasks(data)
            } else if (isApprover) {
                // Approver: Layer 2 - tasks already admin-approved
                const data = await getPendingFinalApprovalTasks()
                setTasks(data)
            }
        } catch (err) {
            console.error('Failed to load tasks:', err)
            showToast('error', 'Failed to load pending approvals')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (task: Task) => {
        setProcessing(task.id)
        try {
            if (isAdmin) {
                await adminApproveTask(task.id)
                showToast('success', 'Task approved - sent to Approver for final review')
            } else if (isApprover) {
                await finalApproveTask(task.id)
                showToast('success', 'Task fully approved!')
            }
            setTasks((prev) => prev.filter((t) => t.id !== task.id))
        } catch (err) {
            showToast('error', 'Failed to approve task')
        } finally {
            setProcessing(null)
        }
    }

    const handleRequestChanges = async () => {
        if (!selectedTask || !changesComment.trim()) {
            showToast('error', 'Please provide feedback')
            return
        }

        setProcessing(selectedTask.id)
        try {
            if (isAdmin) {
                await adminRequestChanges(selectedTask.id, changesComment)
            } else if (isApprover) {
                await approverRequestChanges(selectedTask.id, changesComment)
            }
            setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id))
            setShowChangesModal(false)
            setChangesComment('')
            setSelectedTask(null)
            showToast('success', 'Changes requested - designer will be notified')
        } catch (err) {
            showToast('error', 'Failed to request changes')
        } finally {
            setProcessing(null)
        }
    }

    const openChangesModal = (task: Task) => {
        setSelectedTask(task)
        setShowChangesModal(true)
    }

    // Determine page title based on role
    const pageTitle = isAdmin ? 'Admin Approvals' : isApprover ? 'Final Approvals' : 'Approvals'
    const pageSubtitle = isAdmin
        ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''} awaiting your approval`
        : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} awaiting final approval`

    return (
        <>
            <TopBar
                title={pageTitle}
                subtitle={pageSubtitle}
            />

            <main className="px-6 lg:px-10 py-8">
                {/* Role indicator */}
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                    <p className="text-sm text-emerald-800">
                        {isAdmin && (
                            <>
                                <strong>Layer 1 Review:</strong> Approve tasks completed by designers.
                                Approved tasks will move to the Approver for final sign-off.
                            </>
                        )}
                        {isApprover && (
                            <>
                                <strong>Final Review:</strong> Tasks here have already been reviewed by Admin.
                                Your approval marks them as fully complete.
                            </>
                        )}
                    </p>
                </div>

                {loading ? (
                    <SkeletonTable rows={4} />
                ) : tasks.length === 0 ? (
                    <EmptyState type="approvals" />
                ) : (
                    <div className="grid gap-4">
                        {tasks.map((task, index) => (
                            <Card
                                key={task.id}
                                className={`rounded-2xl border-zinc-200/50 shadow-soft hover-lift animate-fade-in ${task.is_urgent ? 'ring-2 ring-orange-400 border-orange-200' : ''
                                    }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        {/* Task Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold flex-shrink-0 ${task.is_urgent
                                                    ? 'bg-gradient-to-br from-orange-500 to-red-500'
                                                    : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                                                    }`}>
                                                    {task.is_urgent ? <Flame className="w-6 h-6" /> : task.title.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/dashboard/tasks/${task.id}`}
                                                            className="font-semibold text-zinc-900 hover:text-emerald-600 transition text-lg"
                                                        >
                                                            {task.title}
                                                        </Link>
                                                        {task.is_urgent && (
                                                            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                                                🔥 Urgent
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                                        <span className="text-sm text-zinc-500">
                                                            {task.content_type}
                                                        </span>
                                                        {task.content_for && (
                                                            <>
                                                                <span className="text-zinc-300">•</span>
                                                                <span className="text-sm text-zinc-500">{task.content_for}</span>
                                                            </>
                                                        )}
                                                        {task.size && (
                                                            <>
                                                                <span className="text-zinc-300">•</span>
                                                                <span className="text-sm text-zinc-400">{task.size}</span>
                                                            </>
                                                        )}
                                                        <Badge variant={getDesignStatusVariant(task.design_status)}>
                                                            {task.design_status}
                                                        </Badge>
                                                    </div>

                                                    {/* Designer & Deadline */}
                                                    <div className="flex flex-wrap items-center gap-4 mt-3">
                                                        {(task.designer_name || task.designer_id) && (
                                                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                                <Avatar name={task.designer_name || task.designer_id || ''} size="sm" />
                                                                <span>{task.designer_name || 'Designer'}</span>
                                                            </div>
                                                        )}
                                                        {task.deadline && (
                                                            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                                                            <Clock className="w-4 h-4" />
                                                            <span>Submitted {new Date(task.updated_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 lg:flex-shrink-0">
                                            {task.designer_uploads && task.designer_uploads.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setPreviewImage(task.designer_uploads[task.designer_uploads.length - 1].url)}
                                                    className="gap-2 rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50"
                                                    title="Preview designer upload"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                    Preview
                                                </Button>
                                            )}
                                            <Link href={`/dashboard/tasks/${task.id}`}>
                                                <Button variant="outline" className="gap-2 rounded-xl">
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                onClick={() => openChangesModal(task)}
                                                disabled={processing === task.id}
                                                className="gap-2 rounded-xl text-amber-600 border-amber-200 hover:bg-amber-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Changes
                                            </Button>
                                            <Button
                                                onClick={() => handleApprove(task)}
                                                disabled={processing === task.id}
                                                className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                {isAdmin ? 'Approve' : 'Final Approve'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Request Changes Modal */}
            <Modal
                isOpen={showChangesModal}
                onClose={() => {
                    setShowChangesModal(false)
                    setSelectedTask(null)
                    setChangesComment('')
                }}
                title="Request Changes"
                description={selectedTask ? `Provide feedback for "${selectedTask.title}"` : ''}
            >
                <textarea
                    placeholder="Describe what changes are needed..."
                    value={changesComment}
                    onChange={(e) => setChangesComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                    autoFocus
                />
                <ModalFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowChangesModal(false)
                            setSelectedTask(null)
                            setChangesComment('')
                        }}
                        className="rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRequestChanges}
                        disabled={processing !== null}
                        className="rounded-xl bg-amber-500 hover:bg-amber-600"
                    >
                        {processing ? 'Submitting...' : 'Request Changes'}
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
