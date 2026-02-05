import TaskRow from './TaskRow'
import { Task } from '@/lib/tasks'

export default function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-zinc-200/60 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-50 text-xs text-zinc-500">
          <tr>
            <th className="py-3 px-4">Task</th>
            <th className="py-3 px-4">Designer</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Deadline</th>
            <th className="py-3 px-4 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
