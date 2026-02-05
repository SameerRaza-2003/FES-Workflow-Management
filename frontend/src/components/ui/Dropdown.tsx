import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownProps {
    trigger: React.ReactNode
    children: React.ReactNode
    align?: 'left' | 'right'
    className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState<{ top: number, left?: number, right?: number }>({ top: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node) &&
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        const updatePosition = () => {
            if (triggerRef.current && isOpen) {
                const rect = triggerRef.current.getBoundingClientRect()

                // Calculate Top (handling upward opening collision)
                let top = rect.bottom + 8
                // Check if near bottom of viewport
                if (window.innerHeight - rect.bottom < 200) {
                    top = rect.top - 8 // We'll use translateY(-100%) in render
                }

                // Calculate Horizontal Position
                if (align === 'right') {
                    // Align right edge of menu to right edge of trigger
                    const right = window.innerWidth - rect.right
                    setPosition({ top, right })
                } else {
                    // Align left edge of menu to left edge of trigger
                    const left = rect.left
                    setPosition({ top, left })
                }
            }
        }

        if (isOpen) {
            updatePosition()
            document.addEventListener('mousedown', handleClickOutside)
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
        }
    }, [isOpen, align])

    // Render menu through portal
    const menuData = isOpen ? (
        <div
            ref={menuRef}
            style={{
                top: position.top,
                left: position.left,
                right: position.right,
                // If it opens upward (calculated in effect), we need to translate Y by -100%
                transform: window.innerHeight - position.top < 200 ? 'translateY(-100%)' : 'none'
            }}
            className={cn(
                'fixed z-[9999] min-w-[180px] py-1.5 bg-white rounded-xl border border-zinc-200/80 shadow-lg animate-scale-in origin-top-right',
                className
            )}
        >
            {children}
        </div>
    ) : null

    return (
        <div ref={triggerRef} className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>
            {isOpen && typeof document !== 'undefined' && createPortal(menuData, document.body)}
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
