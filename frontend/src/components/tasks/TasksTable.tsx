'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Task, assignDesigner, startTask, completeTask } from '@/lib/tasks'
import { getDesigners, Designer } from '@/lib/users'
import { Badge, getDesignStatusVariant, getApprovalStatusVariant } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import {
  MoreHorizontal,
  Eye,
  Play,
  CheckCircle2,
  UserPlus,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskTableProps {
  tasks: Task[]
  onUpdate?: () => void
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverdue(deadline?: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

function getDaysRemaining(deadline?: string | null): number | null {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function TaskTable({ tasks, onUpdate }: TaskTableProps) {
  const { showToast } = useToast()
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedDesignerId, setSelectedDesignerId] = useState('')
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loadingDesigners, setLoadingDesigners] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Load designers when modal opens
  useEffect(() => {
    if (assignModalOpen) {
      loadDesigners()
    }
  }, [assignModalOpen])

  const loadDesigners = async () => {
    setLoadingDesigners(true)
    try {
      const data = await getDesigners()
      setDesigners(data)
    } catch (err) {
      console.error('Failed to load designers:', err)
      showToast('error', 'Failed to load designers')
    } finally {
      setLoadingDesigners(false)
    }
  }

  const handleAssignDesigner = async () => {
    if (!selectedTask || !selectedDesignerId) return

    setAssigning(true)
    try {
      await assignDesigner(selectedTask.id, selectedDesignerId)
      showToast('success', 'Designer assigned successfully!')
      setAssignModalOpen(false)
      setSelectedDesignerId('')
      setSelectedTask(null)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to assign designer:', err)
      showToast('error', 'Failed to assign designer')
    } finally {
      setAssigning(false)
    }
  }

  const openAssignModal = (task: Task) => {
    setSelectedTask(task)
    setSelectedDesignerId('')
    setAssignModalOpen(true)
  }

  const handleStartTask = async (task: Task) => {
    try {
      await startTask(task.id)
      showToast('success', 'Task started!')
      onUpdate?.()
    } catch (err) {
      console.error('Failed to start task:', err)
      showToast('error', 'Failed to start task')
    }
  }

  const handleCompleteTask = async (task: Task) => {
    try {
      await completeTask(task.id)
      showToast('success', 'Task marked as complete!')
      onUpdate?.()
    } catch (err) {
      console.error('Failed to complete task:', err)
      showToast('error', 'Failed to mark task as complete')
    }
  }

  if (!tasks.length) {
    return null
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-zinc-200/50 shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-100">
                <th className="text-left px-6 py-4 font-medium text-zinc-500">Task</th>
                <th className="text-left px-6 py-4 font-medium text-zinc-500">Designer</th>
                <th className="text-left px-6 py-4 font-medium text-zinc-500">Design Status</th>
                <th className="text-left px-6 py-4 font-medium text-zinc-500">Approval</th>
                <th className="text-left px-6 py-4 font-medium text-zinc-500">Deadline</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {tasks.map((task, index) => {
                const overdue = isOverdue(task.deadline) && task.design_status !== 'Completed'
                const daysLeft = getDaysRemaining(task.deadline)
                const atRisk = daysLeft !== null && daysLeft > 0 && daysLeft <= 3 && task.design_status !== 'Completed'

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      'hover:bg-zinc-50/50 transition animate-fade-in',
                      overdue && 'bg-red-50/30'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Task Info */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/tasks/${encodeURIComponent(task.id)}`}
                        className="block group"
                      >
                        <div className="font-medium text-zinc-900 group-hover:text-emerald-600 transition">
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-500">
                            {task.content_type}
                          </span>
                          {task.size && (
                            <>
                              <span className="text-zinc-300">•</span>
                              <span className="text-xs text-zinc-400">{task.size}</span>
                            </>
                          )}
                        </div>
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {task.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {task.tags.length > 3 && (
                              <span className="text-xs text-zinc-400">
                                +{task.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </td>

                    {/* Designer */}
                    <td className="px-6 py-4">
                      {task.designer_id ? (
                        <div className="flex items-center gap-2">
                          <Avatar name="Designer" size="sm" />
                          <span className="text-zinc-700 text-sm">
                            Assigned
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAssignModal(task)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium transition"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assign
                        </button>
                      )}
                    </td>

                    {/* Design Status */}
                    <td className="px-6 py-4">
                      <Badge variant={getDesignStatusVariant(task.design_status)} dot>
                        {task.design_status}
                      </Badge>
                    </td>

                    {/* Approval Status */}
                    <td className="px-6 py-4">
                      <Badge variant={getApprovalStatusVariant(task.approval_status)}>
                        {task.approval_status}
                      </Badge>
                    </td>

                    {/* Deadline */}
                    <td className="px-6 py-4">
                      <div className={cn(
                        'text-sm',
                        overdue ? 'text-red-600 font-medium' :
                          atRisk ? 'text-amber-600' : 'text-zinc-600'
                      )}>
                        {formatDate(task.deadline)}
                      </div>
                      {overdue && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-500 font-medium">
                            Overdue
                          </span>
                        </div>
                      )}
                      {atRisk && !overdue && (
                        <span className="text-xs text-amber-500 font-medium mt-0.5 block">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <Dropdown
                        trigger={
                          <button className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        }
                        align="right"
                      >
                        <DropdownItem
                          icon={<Eye className="w-4 h-4" />}
                          onClick={() => {
                            window.location.href = `/dashboard/tasks/${encodeURIComponent(task.id)}`
                          }}
                        >
                          View Details
                        </DropdownItem>

                        {!task.designer_id && (
                          <DropdownItem
                            icon={<UserPlus className="w-4 h-4" />}
                            onClick={() => openAssignModal(task)}
                          >
                            Assign Designer
                          </DropdownItem>
                        )}

                        {task.design_status === 'Pending' && task.designer_id && (
                          <DropdownItem
                            icon={<Play className="w-4 h-4" />}
                            onClick={() => handleStartTask(task)}
                          >
                            Start Task
                          </DropdownItem>
                        )}

                        {task.design_status === 'Working' && (
                          <DropdownItem
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            onClick={() => handleCompleteTask(task)}
                          >
                            Mark Complete
                          </DropdownItem>
                        )}
                      </Dropdown>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Designer Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Designer"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Assign a designer to: <strong>{selectedTask?.title}</strong>
          </p>

          {loadingDesigners ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : designers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              No designers available
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Select Designer
              </label>
              <select
                value={selectedDesignerId}
                onChange={(e) => setSelectedDesignerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition bg-white text-zinc-900"
              >
                <option value="">Choose a designer...</option>
                {designers.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.full_name} ({designer.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignDesigner}
            disabled={assigning || !selectedDesignerId}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
