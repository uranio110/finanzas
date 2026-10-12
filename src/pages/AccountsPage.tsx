import { useEffect, useState } from 'react'
import { listAccounts, createAccount, archiveAccount } from '@/data/accounts'
import { listAccountBalances, type AccountBalance } from '@/data/balances'
import { createTransaction } from '@/data/transactions'
import { parseAmountToCents, formatCurrency } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import type { Account, AccountType } from '@/types/database'
import { Card, PageHeader, Button, Input, Select, Modal, EmojiPicker, EmptyState } from '@/components/ui'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Cuenta bancaria' },
  { value: 'savings', label: 'Ahorros' },
  { value: 'card', label: 'Tarjeta débito' },
  { value: 'other', label: 'Otra' },
]

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null)

  async function reload() {
    setLoading(true)
    const [acc, bal] = await Promise.all([listAccounts(), listAccountBalances()])
    setAccounts(acc)
    setBalances(bal)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const balanceFor = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0

  return (
    <div>
      <PageHeader
        title="Cuentas"
        action={<Button onClick={() => setShowCreate(true)}>+ Nueva cuenta</Button>}
      />

      {loading ? null : accounts.length === 0 ? (
        <EmptyState message="Todavía no tienes cuentas. Crea la primera (efectivo, banco, ahorros...)." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{acc.icon}</span>
                <div>
                  <div className="text-sm font-medium text-text">{acc.name}</div>
                  <div className="text-xs text-text-muted">
                    {ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label}
                  </div>
                </div>
              </div>
              <div className="text-xl font-semibold text-text">
                {formatCurrency(balanceFor(acc.id), acc.currency)}
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setAdjustingAccount(acc)}>
                  Corregir saldo
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (confirm(`¿Archivar la cuenta "${acc.name}"? No se borra el historial.`)) {
                      await archiveAccount(acc.id)
                      reload()
                    }
                  }}
                >
                  Archivar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateAccountModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={reload} />
      {adjustingAccount && (
        <AdjustBalanceModal
          account={adjustingAccount}
          currentBalance={balanceFor(adjustingAccount.id)}
          onClose={() => setAdjustingAccount(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}

function CreateAccountModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
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

function AdjustBalanceModal({
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
