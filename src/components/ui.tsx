import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-xl border border-border bg-surface p-4', className)}>{children}</div>
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-text">{title}</h1>
      {action}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return (
    <button
      className={clsx(
        'rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:opacity-90',
        variant === 'secondary' && 'border border-border text-text hover:bg-surface-2',
        variant === 'danger' && 'text-expense hover:bg-expense-soft',
        variant === 'ghost' && 'text-text-muted hover:bg-surface-2 hover:text-text',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none',
        props.className,
      )}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none',
        props.className,
      )}
    />
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const EMOJI_CHOICES = ['👛', '🏦', '💰', '💳', '🐷', '🍔', '🚌', '🏠', '🛒', '🎉', '💊', '📚', '🎮', '✈️', '🧾', '💡']

export function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {EMOJI_CHOICES.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={clsx(
            'rounded-md py-1.5 text-lg',
            value === emoji ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-surface-2',
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-text-faint">{message}</p>
}
