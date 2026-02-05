'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Lock, ChevronDown } from 'lucide-react'

const roles = [
    { value: 'admin', label: 'Admin / Manager' },
    { value: 'designer', label: 'Designer' },
    { value: 'approver', label: 'Approver' },
]

export default function RegisterPage() {
    const router = useRouter()
    const { login } = useAuth()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [role, setRole] = useState('designer')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRegister = async () => {
        // Validation
        if (!fullName || !email || !password) {
            setError('Please fill in all required fields')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        setError('')

        try {
            await api.post('/auth/register', {
                full_name: fullName,
                email,
                password,
                role,
            })

            // Auto-login after registration - use the API-returned data
            const { data } = await api.post('/auth/login', { email, password })

            // Use AuthContext login with API-returned data
            // Role is normalized to lowercase
            const userData = {
                id: data.user_id || '',
                email: data.email || email,
                fullName: data.full_name || fullName,
                role: (data.role || role).toLowerCase(),  // Normalize role
            }


            login(data.access_token, userData)

            // IMPORTANT: Use window.location.href for FULL page refresh
            window.location.href = '/dashboard'
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Registration failed. Please try again.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f6f7fb]">

            {/* LEFT PANEL — BRAND / CONTEXT */}
            <div className="relative hidden lg:flex flex-col justify-center px-24 overflow-hidden">

                {/* Base gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/70 via-sky-100/60 to-purple-100/50" />

                {/* Ambient light blobs */}
                <div className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-emerald-300/35 blur-[160px]" />
                <div className="absolute bottom-[-140px] right-[-140px] h-[480px] w-[480px] rounded-full bg-sky-300/30 blur-[180px]" />

                {/* Content */}
                <div className="relative z-10 max-w-md">
                    <img
                        src="/logo.png"
                        alt="FES"
                        className="
              h-28 w-28
              object-contain
              mb-8
              opacity-90
              drop-shadow-sm
            "
                    />

                    <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                        Join FES Workflow
                        <br />
                        Management
                    </h1>

                    <p className="mt-5 text-zinc-600 leading-relaxed">
                        Create an account to start managing tasks, tracking progress,
                        and collaborating with your team seamlessly.
                    </p>

                    <div className="mt-8 flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-white text-xs font-semibold">JS</div>
                            <div className="w-8 h-8 rounded-full bg-blue-500 ring-2 ring-white flex items-center justify-center text-white text-xs font-semibold">AK</div>
                            <div className="w-8 h-8 rounded-full bg-purple-500 ring-2 ring-white flex items-center justify-center text-white text-xs font-semibold">MR</div>
                        </div>
                        <span className="text-sm text-zinc-500">Join 50+ team members</span>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL — REGISTER */}
            <div className="flex items-center justify-center px-4 sm:px-8 py-12">
                <Card
                    className="
            w-full max-w-md
            rounded-3xl
            border border-zinc-200/70
            bg-white
            shadow-[0_30px_80px_rgba(0,0,0,0.08)]
          "
                >
                    <CardContent className="px-8 sm:px-12 py-10 space-y-6">

                        {/* Mobile logo */}
                        <div className="flex flex-col items-center lg:hidden">
                            <img
                                src="/logo.png"
                                alt="FES"
                                className="h-16 w-16 object-contain opacity-95 mb-2"
                            />
                        </div>

                        {/* Header */}
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-semibold text-zinc-900">
                                Create Account
                            </h2>
                            <p className="text-sm text-zinc-500">
                                Fill in your details to get started
                            </p>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Full Name */}
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    type="text"
                                    placeholder="Full Name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="
                    h-12 pl-11
                    rounded-xl
                    border-zinc-200
                    focus-visible:ring-2
                    focus-visible:ring-emerald-400/60
                  "
                                />
                            </div>

                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="
                    h-12 pl-11
                    rounded-xl
                    border-zinc-200
                    focus-visible:ring-2
                    focus-visible:ring-emerald-400/60
                  "
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="
                    h-12 pl-11
                    rounded-xl
                    border-zinc-200
                    focus-visible:ring-2
                    focus-visible:ring-emerald-400/60
                  "
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="
                    h-12 pl-11
                    rounded-xl
                    border-zinc-200
                    focus-visible:ring-2
                    focus-visible:ring-emerald-400/60
                  "
                                />
                            </div>

                            {/* Role Selector */}
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="
                    w-full h-12 px-4 pr-10
                    rounded-xl
                    border border-zinc-200
                    bg-white
                    text-sm text-zinc-700
                    appearance-none
                    focus:outline-none
                    focus:ring-2
                    focus:ring-emerald-400/60
                  "
                                >
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                            </div>

                            <Button
                                onClick={handleRegister}
                                disabled={loading}
                                className="
                  h-12 w-full
                  rounded-xl
                  bg-gradient-to-b from-emerald-500 to-emerald-600
                  text-white
                  font-medium
                  shadow-[0_10px_25px_rgba(16,185,129,0.35)]
                  hover:brightness-110
                  transition
                  disabled:opacity-60
                "
                            >
                                {loading ? 'Creating account…' : 'Create Account'}
                            </Button>

                            {error && (
                                <p className="text-sm text-red-500 text-center">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Sign In Link */}
                        <p className="text-center text-sm text-zinc-500">
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                className="text-emerald-600 font-medium hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>

                        {/* Footer */}
                        <p className="text-center text-xs text-zinc-400 pt-2">
                            © 2026 FES Education Consultancy
                        </p>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
