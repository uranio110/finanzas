import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '@/auth/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Cuentas', icon: '👛' },
  { to: '/movimientos', label: 'Movim.', icon: '📒' },
  { to: '/rapidas', label: 'Rápidas', icon: '⚡' },
  { to: '/estadisticas', label: 'Estad.', icon: '📈' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

export function Layout() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Navegación lateral (escritorio) */}
      <aside className="hidden w-56 flex-col border-r border-border px-3 py-6 md:flex">
        <div className="mb-6 px-3 text-sm font-semibold tracking-wide text-text-muted">FINANZAS</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <button
          onClick={signOut}
          className="mt-4 rounded-xl px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          Cerrar sesión
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-8 md:pb-6">
          <Outlet />
        </main>

        {/* Navegación inferior (móvil) */}
        <nav className="fixed inset-x-0 bottom-0 flex justify-between border-t border-border bg-surface px-1 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <MobileTab key={item.to} {...item} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
          isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text',
        )
      }
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}

function MobileTab({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        clsx(
          'flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px]',
          isActive ? 'bg-accent-soft text-accent' : 'text-text-muted',
        )
      }
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}
