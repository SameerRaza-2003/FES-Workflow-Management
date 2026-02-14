'use client'

import { cn } from '@/lib/utils'

interface Tab {
    id: string
    label: string
    icon?: React.ReactNode
    count?: number
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string
    onChange: (tabId: string) => void
    className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={cn('flex items-center gap-1 p-1 bg-zinc-100 rounded-xl', className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                        activeTab === tab.id
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700'
                    )}
                >
                    {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span
                            className={cn(
                                'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                                activeTab === tab.id
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-zinc-200 text-zinc-600'
                            )}
                        >
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}

interface TabPanelProps {
    children: React.ReactNode
    isActive: boolean
    className?: string
}

export function TabPanel({ children, isActive, className }: TabPanelProps) {
    if (!isActive) return null

    return (
        <div className={cn('animate-fade-in', className)}>
            {children}
        </div>
    )
}
