'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
    trigger: React.ReactNode
    children: React.ReactNode
    align?: 'left' | 'right'
    className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)

            // Check if dropdown would overflow bottom of viewport
            if (menuRef.current && dropdownRef.current) {
                const triggerRect = dropdownRef.current.getBoundingClientRect()
                const menuHeight = menuRef.current.offsetHeight
                const viewportHeight = window.innerHeight

                if (triggerRect.bottom + menuHeight + 10 > viewportHeight) {
                    setOpenUpward(true)
                } else {
                    setOpenUpward(false)
                }
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div ref={dropdownRef} className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    ref={menuRef}
                    className={cn(
                        'absolute z-[100] min-w-[180px] py-1.5 bg-white rounded-xl border border-zinc-200/80 shadow-lg animate-scale-in',
                        openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
                        align === 'right' ? 'right-0' : 'left-0',
                        className
                    )}
                >
                    {children}
                </div>
            )}
        </div>
    )
}

interface DropdownItemProps {
    children: React.ReactNode
    onClick?: () => void
    icon?: React.ReactNode
    danger?: boolean
    disabled?: boolean
    className?: string
}

export function DropdownItem({
    children,
    onClick,
    icon,
    danger = false,
    disabled = false,
    className
}: DropdownItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex items-center gap-2 w-full px-4 py-2 text-sm text-left transition',
                danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-zinc-700 hover:bg-zinc-50',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
        >
            {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
            {children}
        </button>
    )
}

export function DropdownDivider() {
    return <div className="my-1.5 border-t border-zinc-100" />
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {children}
        </div>
    )
}
