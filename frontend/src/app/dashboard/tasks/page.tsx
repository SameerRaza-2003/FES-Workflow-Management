'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import TaskTable from '@/components/tasks/TaskTable'
import { getTasks, Task } from '@/lib/tasks'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTasks().then(setTasks).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <TopBar title="Tasks" />

      <main className="px-10 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            All Tasks
          </h2>

          <button className="rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm">
            Create Task
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">
            Loading tasks…
          </p>
        ) : (
          <TaskTable tasks={tasks} />
        )}
      </main>
    </>
  )
}
