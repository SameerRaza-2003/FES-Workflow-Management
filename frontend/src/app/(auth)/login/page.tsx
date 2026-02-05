'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      })

      // Store token and user data via AuthContext
      // Role is normalized in AuthContext but we can also normalize here for safety
      const userData = {
        id: data.user_id || data.id || '',
        email: email,
        fullName: data.full_name || email.split('@')[0],
        role: (data.role || 'designer').toLowerCase(),
      }

      login(data.access_token, userData)

      // Use multiple redirect strategies for reliability
      // First try router.push
      router.push('/dashboard')

      // Fallback: If router.push doesn't work within 500ms, use window.location
      setTimeout(() => {
        if (window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard'
        }
      }, 500)
    } catch (err) {
      setError('Invalid email or password')
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
            Manage your workflow
            <br />
            effortlessly
          </h1>

          <p className="mt-5 text-zinc-600 leading-relaxed">
            Plan, assign, track, and approve creative work — all from a single,
            streamlined platform designed for teams.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — LOGIN */}
      <div className="flex items-center justify-center px-4 sm:px-8">
        <Card
          className="
            w-full max-w-md
            rounded-3xl
            border border-zinc-200/70
            bg-white
            shadow-[0_30px_80px_rgba(0,0,0,0.08)]
          "
        >
          <CardContent className="px-8 sm:px-12 py-12 space-y-8">

            {/* Mobile logo */}
            <div className="flex flex-col items-center lg:hidden">
              <img
                src="/logo.png"
                alt="FES"
                className="h-20 w-20 object-contain opacity-95 mb-2"
              />
            </div>

            {/* Header */}
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-zinc-900">
                Welcome back
              </h2>
              <p className="text-sm text-zinc-500">
                Sign in to continue
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  h-12
                  rounded-xl
                  border-zinc-200
                  focus-visible:ring-2
                  focus-visible:ring-emerald-400/60
                "
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  h-12
                  rounded-xl
                  border-zinc-200
                  focus-visible:ring-2
                  focus-visible:ring-emerald-400/60
                "
              />

              <Button
                onClick={handleLogin}
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
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>

              {error && (
                <p className="text-sm text-red-500 text-center">
                  {error}
                </p>
              )}
            </div>

            {/* Sign In Link */}
            <p className="text-center text-sm text-zinc-500">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-emerald-600 font-medium hover:underline"
              >
                Create one
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
