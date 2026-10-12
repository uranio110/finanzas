import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '@/auth/AuthContext'

const DESKTOP_NAV_ITEMS = [
  { to: '/', label: 'Cuentas', icon: '👛' },
  { to: '/movimientos', label: 'Movimientos', icon: '📒' },
  { to: '/rapidas', label: 'Rápidas', icon: '⚡' },
  { to: '/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/estadisticas', label: 'Estadísticas', icon: '📈' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

// En móvil solo caben unas pocas pestañas cómodamente; el resto queda en "Más".
const MOBILE_NAV_ITEMS = [
  { to: '/', label: 'Cuentas', icon: '👛' },
  { to: '/movimientos', label: 'Movim.', icon: '📒' },
  { to: '/rapidas', label: 'Rápidas', icon: '⚡' },
  { to: '/estadisticas', label: 'Estad.', icon: '📈' },
]

const MORE_NAV_ITEMS = [
  { to: '/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

export function Layout() {
  const { signOut } = useAuth()
  const [showMore, setShowMore] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Navegación lateral (escritorio) */}
      <aside className="hidden w-56 flex-col border-r border-border px-3 py-6 md:flex">
        <div className="mb-6 px-3 text-sm font-semibold tracking-wide text-text-muted">FINANZAS</div>
        <nav className="flex flex-1 flex-col gap-1">
          {DESKTOP_NAV_ITEMS.map((item) => (
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
        <nav className="fixed inset-x-0 bottom-0 flex justify-between border-t border-border bg-surface px-2 py-2 md:hidden">
          {MOBILE_NAV_ITEMS.map((item) => (
            <MobileTab key={item.to} {...item} />
          ))}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] text-text-muted"
          >
            <span className="text-base leading-none">⋯</span>
            Más
          </button>
        </nav>
      </div>

      {showMore && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 md:hidden" onClick={() => setShowMore(false)}>
          <div
            className="w-full rounded-t-3xl border-t border-border bg-surface p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex flex-col gap-1">
              {MORE_NAV_ITEMS.map((item) => (
                <button
                  key={item.to}
                  onClick={() => {
                    setShowMore(false)
                    navigate(item.to)
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-text hover:bg-surface-2"
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <button
                onClick={signOut}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-expense hover:bg-expense-soft"
              >
                <span className="text-lg">🚪</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
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
