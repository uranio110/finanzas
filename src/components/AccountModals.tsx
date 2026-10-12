import { useState } from 'react'
import { createAccount } from '@/data/accounts'
import { createTransaction } from '@/data/transactions'
import { parseAmountToCents, formatCurrency } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import type { Account, AccountType } from '@/types/database'
import { Button, Input, Select, Modal, EmojiPicker } from '@/components/ui'

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Cuenta bancaria' },
  { value: 'savings', label: 'Ahorros' },
  { value: 'card', label: 'Tarjeta débito' },
  { value: 'piggy', label: 'Alcancía (no cuenta en el saldo disponible)' },
  { value: 'other', label: 'Otra' },
]

export function CreateAccountModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [icon, setIcon] = useState('👛')
  const [opening, setOpening] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseAmountToCents(opening) ?? 0
    setSaving(true)
    setError(null)
    try {
      await createAccount({ name, type, icon, openingBalanceCents: cents })
      setName('')
      setOpening('0')
      onClose()
      onCreated()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva cuenta">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input placeholder="Nombre (ej. Efectivo, Bancolombia)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        {type === 'piggy' && (
          <p className="text-xs text-text-faint">
            El dinero de una alcancía se sigue registrando y viendo por separado, pero no suma al "saldo disponible"
            del inicio — es dinero apartado, no para gastar del día a día.
          </p>
        )}
        <EmojiPicker value={icon} onChange={setIcon} />
        <Input placeholder="Saldo inicial" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
        {error && <p className="text-xs text-expense">{error}</p>}
        <Button type="submit" disabled={saving || !name}>
          {saving ? 'Guardando…' : 'Crear cuenta'}
        </Button>
      </form>
    </Modal>
  )
}

export function AdjustBalanceModal({
  account,
  currentBalance,
  onClose,
  onSaved,
}: {
  account: Account
  currentBalance: number
  onClose: () => void
  onSaved: () => void
}) {
  const [real, setReal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const realCents = parseAmountToCents(real)
    if (realCents === null) return
    const delta = realCents - currentBalance
    if (delta === 0) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      // El ajuste es una transacción normal (kind='adjustment'): no se
      // sobrescribe ningún número, queda registrado en el historial.
      await createTransaction({
        accountId: account.id,
        categoryId: null,
        amountCents: delta,
        occurredAt: new Date().toISOString().slice(0, 10),
        note: 'Corrección de saldo',
        kind: 'adjustment',
      })
      onClose()
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Corregir saldo — ${account.name}`}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-xs text-text-muted">
          Saldo actual en la app: {formatCurrency(currentBalance, account.currency)}. Escribe el saldo real y se
          registrará un ajuste por la diferencia, sin borrar el historial.
        </p>
        <Input
          placeholder="Saldo real"
          inputMode="decimal"
          value={real}
          onChange={(e) => setReal(e.target.value)}
          autoFocus
        />
        {error && <p className="text-xs text-expense">{error}</p>}
        <Button type="submit" disabled={saving || !real}>
          {saving ? 'Guardando…' : 'Guardar ajuste'}
        </Button>
      </form>
    </Modal>
  )
}
