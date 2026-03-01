'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import {
  LayoutDashboard,
  CheckSquare,
  FileCheck,
  BarChart3,
  Bell,
  LogOut,
  Settings,
  ChevronRight,
  Send,
  ListTodo,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
  designerOnly?: boolean
  approverAllowed?: boolean  // If true, approvers can also see this item
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    label: 'Posting',
    href: '/dashboard/posting',
    icon: <Send className="w-5 h-5" />,
    adminOnly: true
  },
  {
    label: 'My Tasks',
    href: '/dashboard/tasks',
    icon: <CheckSquare className="w-5 h-5" />,
    designerOnly: true
  },
  {
    label: 'All Tasks',
    href: '/dashboard/tasks',
    icon: <CheckSquare className="w-5 h-5" />,
    adminOnly: true
  },
  {
    label: 'Approvals',
    href: '/dashboard/approvals',
    icon: <FileCheck className="w-5 h-5" />,
    adminOnly: true,
    approverAllowed: true  // Approvers can also see this
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    adminOnly: true
  },

  {
    label: 'Todos',
    href: '/dashboard/todos',
    icon: <ListTodo className="w-5 h-5" />
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: <CalendarDays className="w-5 h-5" />
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: <Bell className="w-5 h-5" />
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout, isAdmin, isDesigner, isApprover } = useAuth()
  const { showToast } = useToast()

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => {
    // Approver-allowed items can be seen by approvers even if adminOnly
    if (item.adminOnly && item.approverAllowed && isApprover) return true
    if (item.adminOnly && !isAdmin) return false
    if (item.designerOnly && !isDesigner) return false
    // If both adminOnly items and designerOnly items for tasks, show appropriate one
    if (item.label === 'All Tasks' && isDesigner) return false
    if (item.label === 'My Tasks' && (isAdmin || isApprover)) return false
    return true
  })


  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="
      w-72
      bg-white/90
      backdrop-blur-xl
      border-r border-zinc-200/60
      px-5
      py-6
      hidden lg:flex
      flex-col
      h-screen
      sticky top-0
    ">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <img
          src="/logo.png"
          alt="FES Workflow"
          className="h-10 w-10 object-contain"
        />
        <div>
          <span className="font-semibold text-zinc-900 text-lg">
            FES Workflow
          </span>
          <p className="text-xs text-zinc-500">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {filteredNavItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group',
                active
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              )}
            >
              <span className={cn(
                'transition',
                active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-600'
              )}>
                {item.icon}
              </span>
              {item.label}
              {active && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="pt-4 border-t border-zinc-200/60">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-100 transition cursor-pointer">
          <Avatar name={user?.fullName || 'User'} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-zinc-500 capitalize">
              {user?.role || 'Member'}
            </p>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => showToast('info', 'Settings page coming soon!')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-zinc-400 text-center mt-4">
        © 2026 FES
      </p>
    </aside>
  )
}
