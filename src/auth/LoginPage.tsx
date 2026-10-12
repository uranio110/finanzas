import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export function LoginPage() {
  const { allowed, session, signInWithGithub, signOut } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <h1 className="text-lg font-medium text-text">Falta configurar Supabase</h1>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          Copia <code className="rounded bg-surface-2 px-1 py-0.5">.env.example</code> a{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5">.env.local</code> y completa
          <code className="mx-1 rounded bg-surface-2 px-1 py-0.5">VITE_SUPABASE_URL</code>y
          <code className="ml-1 rounded bg-surface-2 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </Centered>
    )
  }

  if (session && allowed === 'denied') {
    return (
      <Centered>
        <h1 className="text-lg font-medium text-text">Cuenta no autorizada</h1>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          Tu cuenta de GitHub inició sesión correctamente, pero no está en la lista de
          personas autorizadas para esta app.
        </p>
        <button
          onClick={signOut}
          className="mt-6 rounded-full border border-border px-4 py-2 text-sm text-text hover:bg-surface-2"
        >
          Cerrar sesión
        </button>
      </Centered>
    )
  }

  return (
    <Centered>
      <h1 className="text-xl font-medium text-text">Finanzas</h1>
      <p className="mt-2 max-w-xs text-sm text-text-muted">
        Acceso restringido. Inicia sesión con la cuenta de GitHub autorizada.
      </p>
      <button
        onClick={signInWithGithub}
        className="mt-6 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        <GithubMark />
        Iniciar sesión con GitHub
      </button>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      {children}
    </div>
  )
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.5 0 1.09-.01 1.96-.01 2.23 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
