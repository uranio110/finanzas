import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AllowedStatus = 'checking' | 'allowed' | 'denied'

interface AuthState {
  session: Session | null
  loading: boolean
  allowed: AllowedStatus
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState<AllowedStatus>('checking')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setAllowed('checking')
      return
    }
    setAllowed('checking')
    supabase
      .rpc('am_i_allowed')
      .then(({ data, error }) => {
        if (error) {
          console.error('[auth] am_i_allowed falló:', error.message)
          setAllowed('denied')
          return
        }
        setAllowed(data ? 'allowed' : 'denied')
      })
  }, [session])

  async function signInWithGithub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, allowed, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
