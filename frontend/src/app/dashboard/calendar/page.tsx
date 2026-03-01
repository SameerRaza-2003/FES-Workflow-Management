'use client'

import { useEffect, useState, useMemo } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    Loader2,
    Trash2,
    Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    CalendarEvent,
    EventCreate,
    createEvent,
    getEventsByMonth,
    deleteEvent,
} from '@/lib/events'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const typeColors: Record<string, string> = {
    meeting: '#6366f1',
    deadline: '#ef4444',
    review: '#f59e0b',
    other: '#10b981',
}

const typeLabels: Record<string, string> = {
    meeting: '🤝 Meeting',
    deadline: '⏰ Deadline',
    review: '📝 Review',
    other: '📌 Other',
}

function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function CalendarPage() {
    const { showToast } = useToast()

    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)

    // Form
    const [newTitle, setNewTitle] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [newType, setNewType] = useState<'meeting' | 'deadline' | 'review' | 'other'>('meeting')
    const [newStart, setNewStart] = useState('')
    const [newEnd, setNewEnd] = useState('')
    const [newColor, setNewColor] = useState('#6366f1')

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

    useEffect(() => {
        loadEvents()
    }, [monthStr])

    const loadEvents = async () => {
        setLoading(true)
        try {
            const data = await getEventsByMonth(monthStr)
            setEvents(data)
        } catch (err) {
            showToast('error', 'Failed to load events')
        } finally {
            setLoading(false)
        }
    }

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const prevMonthDays = new Date(year, month, 0).getDate()

        const days: { date: number; month: number; year: number; isCurrentMonth: boolean; dateStr: string }[] = []

        // Previous month padding
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = prevMonthDays - i
            const m = month === 0 ? 11 : month - 1
            const y = month === 0 ? year - 1 : year
            days.push({
                date: d,
                month: m,
                year: y,
                isCurrentMonth: false,
                dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            })
        }

        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({
                date: d,
                month,
                year,
                isCurrentMonth: true,
                dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            })
        }

        // Next month padding
        const remaining = 42 - days.length
        for (let d = 1; d <= remaining; d++) {
            const m = month === 11 ? 0 : month + 1
            const y = month === 11 ? year + 1 : year
            days.push({
                date: d,
                month: m,
                year: y,
                isCurrentMonth: false,
                dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            })
        }

        return days
    }, [year, month])

    // Events grouped by date string — multi-day events appear on every day
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {}
        for (const e of events) {
            const start = new Date(e.start_datetime)
            const end = new Date(e.end_datetime)
            // Walk from start date to end date (inclusive)
            const cursor = new Date(start)
            cursor.setHours(0, 0, 0, 0)
            const endDay = new Date(end)
            endDay.setHours(0, 0, 0, 0)
            while (cursor <= endDay) {
                const dateStr = cursor.toISOString().slice(0, 10)
                if (!map[dateStr]) map[dateStr] = []
                map[dateStr].push(e)
                cursor.setDate(cursor.getDate() + 1)
            }
        }
        return map
    }, [events])

    const todayStr = new Date().toISOString().slice(0, 10)
    const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : []

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
    const goToday = () => setCurrentDate(new Date())

    const handleCreate = async () => {
        if (!newTitle.trim() || !newStart || !newEnd) return
        setCreating(true)
        try {
            const payload: EventCreate = {
                title: newTitle.trim(),
                description: newDesc.trim() || undefined,
                start_datetime: new Date(newStart).toISOString(),
                end_datetime: new Date(newEnd).toISOString(),
                color_label: newColor,
                event_type: newType,
            }
            const created = await createEvent(payload)
            setEvents(prev => [...prev, created])
            setShowCreateModal(false)
            setNewTitle('')
            setNewDesc('')
            setNewStart('')
            setNewEnd('')
            showToast('success', 'Event created!')
        } catch (err: any) {
            showToast('error', err?.response?.data?.detail || 'Failed to create event')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteEvent = async (id: string) => {
        try {
            await deleteEvent(id)
            setEvents(prev => prev.filter(e => e.id !== id))
            showToast('success', 'Event deleted')
        } catch {
            showToast('error', 'Failed to delete event')
        }
    }

    const openCreateForDate = (dateStr: string) => {
        setNewStart(`${dateStr}T09:00`)
        setNewEnd(`${dateStr}T10:00`)
        setShowCreateModal(true)
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    return (
        <>
            <TopBar title="Calendar" subtitle="Events & schedule" />

            <main className="px-6 lg:px-10 py-8">
                <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 140px)' }}>

                    {/* Calendar Grid */}
                    <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition">
                                    <ChevronLeft className="w-5 h-5 text-zinc-600" />
                                </button>
                                <h2 className="text-xl font-bold text-zinc-900 min-w-[200px] text-center">{monthName}</h2>
                                <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition">
                                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                                </button>
                                <button
                                    onClick={goToday}
                                    className="ml-2 px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition"
                                >
                                    Today
                                </button>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Event
                            </button>
                        </div>

                        {/* Grid */}
                        <Card className="rounded-2xl border-zinc-200/60 overflow-hidden">
                            <CardContent className="p-0">
                                {/* Day headers */}
                                <div className="grid grid-cols-7 border-b border-zinc-200/60">
                                    {DAYS.map(d => (
                                        <div key={d} className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider py-3">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Date cells */}
                                <div className="grid grid-cols-7">
                                    {calendarDays.map((day, i) => {
                                        const dayEvents = eventsByDate[day.dateStr] || []
                                        const isToday = day.dateStr === todayStr
                                        const isSelected = day.dateStr === selectedDate

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedDate(day.dateStr)}
                                                onDoubleClick={() => openCreateForDate(day.dateStr)}
                                                className={cn(
                                                    'relative h-24 p-2 border-b border-r border-zinc-100 text-left transition-colors hover:bg-zinc-50/80',
                                                    !day.isCurrentMonth && 'bg-zinc-50/40',
                                                    isSelected && 'bg-indigo-50/60 ring-1 ring-indigo-200',
                                                )}
                                            >
                                                <span className={cn(
                                                    'text-xs font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full',
                                                    isToday
                                                        ? 'bg-indigo-500 text-white'
                                                        : day.isCurrentMonth
                                                            ? 'text-zinc-700'
                                                            : 'text-zinc-300'
                                                )}>
                                                    {day.date}
                                                </span>

                                                {/* Event dots */}
                                                <div className="mt-1 space-y-0.5">
                                                    {dayEvents.slice(0, 3).map((evt, j) => (
                                                        <div
                                                            key={j}
                                                            className="text-[10px] truncate px-1.5 py-0.5 rounded font-medium text-white"
                                                            style={{ backgroundColor: evt.color_label || typeColors[evt.event_type] }}
                                                        >
                                                            {evt.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className="text-[10px] text-zinc-400 pl-1">+{dayEvents.length - 3} more</span>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Day Events Panel (right sidebar) */}
                    {selectedDate && (
                        <div className="w-80 flex-shrink-0">
                            <Card className="rounded-2xl border-zinc-200/60 sticky top-24">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900">
                                                {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-zinc-100 rounded-lg transition">
                                            <X className="w-4 h-4 text-zinc-400" />
                                        </button>
                                    </div>

                                    {selectedEvents.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-zinc-400 mb-3">No events</p>
                                            <button
                                                onClick={() => openCreateForDate(selectedDate)}
                                                className="text-xs text-indigo-500 hover:underline"
                                            >
                                                + Add event
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedEvents.map(evt => (
                                                <div
                                                    key={evt.id}
                                                    className="p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition group"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: evt.color_label || typeColors[evt.event_type] }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-zinc-900 truncate">{evt.title}</p>
                                                            <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTime(evt.start_datetime)} – {formatTime(evt.end_datetime)}
                                                            </p>
                                                            {evt.description && (
                                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{evt.description}</p>
                                                            )}
                                                            <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                                                                {typeLabels[evt.event_type] || evt.event_type}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteEvent(evt.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition text-zinc-300 hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4 animate-fade-in">
                        <h2 className="text-lg font-semibold text-zinc-900">New Event</h2>

                        <input
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Event title"
                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            autoFocus
                        />
                        <textarea
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">Start</label>
                                <input
                                    type="datetime-local"
                                    value={newStart}
                                    onChange={e => setNewStart(e.target.value)}
                                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">End</label>
                                <input
                                    type="datetime-local"
                                    value={newEnd}
                                    onChange={e => setNewEnd(e.target.value)}
                                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">Type</label>
                                <select
                                    value={newType}
                                    onChange={e => setNewType(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                >
                                    <option value="meeting">🤝 Meeting</option>
                                    <option value="deadline">⏰ Deadline</option>
                                    <option value="review">📝 Review</option>
                                    <option value="other">📌 Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">Color</label>
                                <div className="flex gap-2 items-center">
                                    {['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewColor(c)}
                                            className={cn(
                                                'w-7 h-7 rounded-full transition-transform',
                                                newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-zinc-300' : 'hover:scale-110'
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newTitle.trim() || !newStart || !newEnd}
                                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
