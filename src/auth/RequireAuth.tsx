import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { LoginPage } from './LoginPage'
import { isSupabaseConfigured } from '@/lib/supabase'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, allowed } = useAuth()

  if (!isSupabaseConfigured) return <LoginPage />
  if (loading || (session && allowed === 'checking')) return null
  if (!session || allowed !== 'allowed') return <LoginPage />

  return <>{children}</>
}
