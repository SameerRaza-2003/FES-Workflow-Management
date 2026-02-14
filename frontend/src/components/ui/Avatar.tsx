'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
    name?: string
    src?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const sizeStyles = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
}

const colorPalette = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
]

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getColorFromName(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colorPalette[Math.abs(hash) % colorPalette.length]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
    const initials = name ? getInitials(name) : '?'
    const bgColor = name ? getColorFromName(name) : 'bg-zinc-400'

    if (src) {
        return (
            <div
                className={cn(
                    'relative rounded-full overflow-hidden flex-shrink-0',
                    sizeStyles[size],
                    className
                )}
            >
                <img
                    src={src}
                    alt={name || 'Avatar'}
                    className="w-full h-full object-cover"
                />
            </div>
        )
    }

    return (
        <div
            className={cn(
                'flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0',
                sizeStyles[size],
                bgColor,
                className
            )}
        >
            {initials}
        </div>
    )
}

export function AvatarGroup({
    names,
    max = 3,
    size = 'sm'
}: {
    names: string[]
    max?: number
    size?: 'sm' | 'md' | 'lg'
}) {
    const displayed = names.slice(0, max)
    const remaining = names.length - max

    return (
        <div className="flex -space-x-2">
            {displayed.map((name, i) => (
                <Avatar
                    key={i}
                    name={name}
                    size={size}
                    className="ring-2 ring-white"
                />
            ))}
            {remaining > 0 && (
                <div
                    className={cn(
                        'flex items-center justify-center rounded-full bg-zinc-200 text-zinc-600 font-medium ring-2 ring-white',
                        sizeStyles[size]
                    )}
                >
                    +{remaining}
                </div>
            )}
        </div>
    )
}
