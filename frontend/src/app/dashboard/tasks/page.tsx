'use client'

import { useEffect, useMemo, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import TaskTable from '@/components/tasks/TasksTable'
import { getTasks, getMyTasks, Task, createTask, TaskCreate, CONTENT_FOR_OPTIONS, ContentForEntity } from '@/lib/tasks'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import {
  Plus,
  Search,
  Filter,
  Calendar,
  X
} from 'lucide-react'

const DESIGN_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Working', label: 'Working' },
  { id: 'Completed', label: 'Completed' },
  { id: 'OnHold', label: 'On Hold' },
]

export default function TasksPage() {
  const { isAdmin, isDesigner } = useAuth()
  const { showToast } = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [designFilter, setDesignFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create task form state
  const [newTask, setNewTask] = useState<TaskCreate>({
    content_type: '',
    title: '',
    content: '',
    instructions: '',
    deadline: '',
    size: '',
    tags: [],
    content_for: null,
    is_urgent: false,
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [isDesigner])

  const loadTasks = async () => {
    setLoading(true)
    try {
      // Designers see their tasks, admins see all
      const data = isDesigner ? await getMyTasks() : await getTasks()
      setTasks(data)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      showToast('error', 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = useMemo(() => {
    let result = tasks

    // Filter by design status
    if (designFilter !== 'All') {
      result = result.filter((task) => task.design_status === designFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.content_type.toLowerCase().includes(query) ||
          task.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [tasks, designFilter, searchQuery])

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.content_type) {
      showToast('error', 'Please fill in required fields')
      return
    }

    setCreating(true)
    try {
      const created = await createTask({
        ...newTask,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : undefined,
      })
      setTasks((prev) => [created, ...prev])
      setShowCreateModal(false)
      setNewTask({
        content_type: '',
        title: '',
        content: '',
        instructions: '',
        deadline: '',
        size: '',
        tags: [],
        content_for: null,
        is_urgent: false,
      })
      showToast('success', 'Task created successfully')
    } catch (err) {
      console.error('Failed to create task:', err)
      showToast('error', 'Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const statusCounts = useMemo(() => {
    return DESIGN_FILTERS.map(filter => ({
      ...filter,
      count: filter.id === 'All'
        ? tasks.length
        : tasks.filter(t => t.design_status === filter.id).length
    }))
  }, [tasks])

  return (
    <>
      <TopBar
        title={isDesigner ? 'My Tasks' : 'All Tasks'}
        subtitle={`${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}`}
      />

      <main className="px-6 lg:px-10 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>

          {/* Actions */}
          {isAdmin && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {statusCounts.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setDesignFilter(filter.id)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${designFilter === filter.id
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }
              `}
            >
              {filter.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${designFilter === filter.id ? 'bg-white/20' : 'bg-zinc-100'
                }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonTable rows={5} />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            type={searchQuery ? 'search' : 'tasks'}
            action={
              isAdmin && !searchQuery && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="gap-2 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Create your first task
                </Button>
              )
            }
          />
        ) : (
          <TaskTable tasks={filteredTasks} onUpdate={loadTasks} />
        )}
      </main>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
        description="Fill in the details to create a new task"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Content Type <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Social Media Post, Banner"
                value={newTask.content_type}
                onChange={(e) => setNewTask({ ...newTask, content_type: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Size
              </label>
              <Input
                placeholder="e.g., 1080x1080"
                value={newTask.size || ''}
                onChange={(e) => setNewTask({ ...newTask, size: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Deadline
              </label>
              <Input
                type="datetime-local"
                value={newTask.deadline || ''}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Content For and Urgent */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Content For
              </label>
              <select
                value={newTask.content_for || ''}
                onChange={(e) => setNewTask({ ...newTask, content_for: (e.target.value || null) as ContentForEntity | null })}
                className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">Select entity...</option>
                {CONTENT_FOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={newTask.is_urgent || false}
                  onChange={(e) => setNewTask({ ...newTask, is_urgent: e.target.checked })}
                  className="w-5 h-5 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-zinc-700">
                  🔥 Mark as Urgent
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Content / Copy
            </label>
            <textarea
              placeholder="Main content or copy for the design"
              value={newTask.content || ''}
              onChange={(e) => setNewTask({ ...newTask, content: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Instructions
            </label>
            <textarea
              placeholder="Special instructions for the designer"
              value={newTask.instructions || ''}
              onChange={(e) => setNewTask({ ...newTask, instructions: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateTask}
            disabled={creating}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
