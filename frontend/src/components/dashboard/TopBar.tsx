'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown'
import { getNotifications, Notification, markNotificationRead } from '@/lib/notifications'
import {
  Bell,
  Search,
  Menu,
  Settings,
  LogOut,
  Check,
  FileText,
  X
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
}

export default function TopBar({ title, subtitle, onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60">
      <div className="flex items-center justify-between px-6 lg:px-10 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-600"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-zinc-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            {showSearch ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 h-10 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-600 transition"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-600 transition"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-zinc-200 shadow-medium animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900">Notifications</h3>
                  <Link
                    href="/dashboard/notifications"
                    className="text-xs text-emerald-600 hover:underline"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all
                  </Link>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">No notifications</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition cursor-pointer',
                          !notification.is_read && 'bg-emerald-50/50'
                        )}
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                            notification.is_read ? 'bg-zinc-100' : 'bg-emerald-100'
                          )}>
                            <FileText className={cn(
                              'w-4 h-4',
                              notification.is_read ? 'text-zinc-500' : 'text-emerald-600'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm line-clamp-2',
                              notification.is_read ? 'text-zinc-600' : 'text-zinc-900 font-medium'
                            )}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <Dropdown
            trigger={
              <div className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-zinc-100 transition cursor-pointer">
                <Avatar name={user?.fullName || 'User'} size="sm" />
                <span className="text-sm font-medium text-zinc-700 hidden sm:block">
                  {user?.fullName?.split(' ')[0] || 'User'}
                </span>
              </div>
            }
            align="right"
          >
            <div className="px-4 py-3 border-b border-zinc-100">
              <p className="font-medium text-zinc-900">{user?.fullName || 'User'}</p>
              <p className="text-sm text-zinc-500">{user?.email}</p>
            </div>
            <DropdownItem icon={<Settings className="w-4 h-4" />}>
              Settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem
              icon={<LogOut className="w-4 h-4" />}
              danger
              onClick={logout}
            >
              Sign out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  )
}
