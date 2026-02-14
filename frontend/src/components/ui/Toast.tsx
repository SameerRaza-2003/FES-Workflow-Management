'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
}

interface ToastContextValue {
    toasts: Toast[]
    showToast: (type: ToastType, title: string, message?: string) => void
    dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Math.random().toString(36).slice(2)
        setToasts((prev) => [...prev, { id, type, title, message }])

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 5000)
    }, [])

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    )
}

const iconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
}

const styleMap = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconStyleMap = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
}

function ToastContainer({
    toasts,
    onDismiss
}: {
    toasts: Toast[]
    onDismiss: (id: string) => void
}) {
    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            {toasts.map((toast) => {
                const Icon = iconMap[toast.type]
                return (
                    <div
                        key={toast.id}
                        className={cn(
                            'flex items-start gap-3 p-4 rounded-xl border shadow-medium animate-slide-in min-w-[320px] max-w-md',
                            styleMap[toast.type]
                        )}
                    >
                        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconStyleMap[toast.type])} />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{toast.title}</p>
                            {toast.message && (
                                <p className="mt-0.5 text-sm opacity-80">{toast.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="p-1 rounded hover:bg-black/5 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
