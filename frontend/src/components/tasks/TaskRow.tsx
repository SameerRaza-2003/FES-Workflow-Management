import StatusBadge from './StatusBadge'
import { Task } from '@/lib/tasks'

export default function TaskRow({ task }: { task: Task }) {
  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50 transition">
      <td className="py-3 px-4">
        <div className="font-medium text-zinc-900">
          {task.title}
        </div>
        <div className="text-xs text-zinc-500">
          {task.content_type}
        </div>
      </td>

      <td className="py-3 px-4 text-sm text-zinc-600">
        {task.designer_id ?? 'Unassigned'}
      </td>

      <td className="py-3 px-4">
        <StatusBadge status={task.design_status} />
      </td>

      <td className="py-3 px-4 text-sm text-zinc-600">
        {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
      </td>

      <td className="py-3 px-4 text-right">
        <button className="text-sm text-emerald-600 hover:underline">
          View
        </button>
      </td>
    </tr>
  )
}
