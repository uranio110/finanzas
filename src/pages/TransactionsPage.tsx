import { useEffect, useMemo, useState } from 'react'
import { listTransactions, createTransaction, deleteTransaction, type TransactionFilters } from '@/data/transactions'
import { listTransfers, createTransfer, deleteTransfer } from '@/data/transfers'
import { listAccounts } from '@/data/accounts'
import { listCategories } from '@/data/categories'
import { formatCurrency, parseAmountToCents } from '@/utils/currency'
import { downloadCsv } from '@/utils/csv'
import type { Account, Category, Transaction, Transfer } from '@/types/database'
import { Card, PageHeader, Button, Input, Select, Modal, EmptyState } from '@/components/ui'

type Entry =
  | { kind: 'transaction'; data: Transaction }
  | { kind: 'transfer'; data: Transfer }

export function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({})

  async function reload() {
    setLoading(true)
    const [acc, cat, tx, tr] = await Promise.all([
      listAccounts(),
      listCategories(),
      listTransactions(filters),
      listTransfers(),
    ])
    setAccounts(acc)
    setCategories(cat)
    setTransactions(tx)
    setTransfers(tr)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.accountId, filters.categoryId, filters.from, filters.to, filters.kind])

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const categoryOf = (id: string | null) => categories.find((c) => c.id === id)

  const entries: Entry[] = useMemo(() => {
    const txEntries: Entry[] = transactions.map((t) => ({ kind: 'transaction', data: t }))
    const trEntries: Entry[] = filters.accountId || filters.categoryId || filters.kind
      ? [] // las transferencias no tienen categoría/tipo ingreso-gasto; se ocultan al filtrar por esos campos
      : transfers.map((t) => ({ kind: 'transfer', data: t }))
    return [...txEntries, ...trEntries].sort((a, b) => b.data.occurred_at.localeCompare(a.data.occurred_at))
  }, [transactions, transfers, filters])

  function exportCsv() {
    const rows = entries.map((e) => {
      if (e.kind === 'transaction') {
        const cat = categoryOf(e.data.category_id)
        return {
          fecha: e.data.occurred_at,
          tipo: e.data.kind === 'adjustment' ? 'ajuste' : e.data.amount >= 0 ? 'ingreso' : 'gasto',
          cuenta: accountName(e.data.account_id),
          categoria: cat?.name ?? '',
          importe: (e.data.amount / 100).toFixed(2),
          nota: e.data.note ?? '',
        }
      }
      return {
        fecha: e.data.occurred_at,
        tipo: 'transferencia',
        cuenta: `${accountName(e.data.source_account_id)} → ${accountName(e.data.destination_account_id)}`,
        categoria: '',
        importe: (e.data.amount / 100).toFixed(2),
        nota: e.data.note ?? '',
      }
    })
    downloadCsv('movimientos.csv', rows)
  }

  return (
    <div>
      <PageHeader
        title="Movimientos"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>
              Exportar CSV
            </Button>
            <Button onClick={() => setShowNew(true)}>+ Nuevo</Button>
          </div>
        }
      />

      <Card className="mb-4 grid gap-2 sm:grid-cols-4">
        <Select
          value={filters.accountId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value || undefined }))}
        >
          <option value="">Todas las cuentas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.categoryId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value || undefined }))}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input type="date" value={filters.from ?? ''} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))} />
        <Input type="date" value={filters.to ?? ''} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))} />
      </Card>

      {!loading && entries.length === 0 && <EmptyState message="No hay movimientos con estos filtros." />}

      <div className="flex flex-col gap-1">
        {entries.map((e) => (
          <EntryRow
            key={e.data.id}
            entry={e}
            accountName={accountName}
            category={e.kind === 'transaction' ? categoryOf(e.data.category_id) : undefined}
            onDelete={async () => {
              if (!confirm('¿Eliminar este movimiento?')) return
              if (e.kind === 'transaction') await deleteTransaction(e.data.id)
              else await deleteTransfer(e.data.id)
              reload()
            }}
          />
        ))}
      </div>

      <NewEntryModal open={showNew} onClose={() => setShowNew(false)} accounts={accounts} categories={categories} onSaved={reload} />
    </div>
  )
}

function EntryRow({
  entry,
  accountName,
  category,
  onDelete,
}: {
  entry: Entry
  accountName: (id: string) => string
  category?: Category
  onDelete: () => void
}) {
  const isTransfer = entry.kind === 'transfer'
  const amount = entry.data.amount
  const colorClass = isTransfer ? 'text-transfer' : amount >= 0 ? 'text-income' : 'text-expense'

  return (
    <Card className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">{isTransfer ? '🔁' : category?.icon ?? '💤'}</span>
        <div>
          <div className="text-sm text-text">
            {isTransfer
              ? `${accountName((entry.data as Transfer).source_account_id)} → ${accountName((entry.data as Transfer).destination_account_id)}`
              : category?.name ?? (entry.data as Transaction).note ?? 'Sin categoría'}
          </div>
          <div className="text-xs text-text-muted">
            {entry.data.occurred_at}
            {!isTransfer && ` · ${accountName((entry.data as Transaction).account_id)}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${colorClass}`}>
          {isTransfer ? '' : amount >= 0 ? '+' : ''}
          {formatCurrency(amount)}
        </span>
        <button onClick={onDelete} className="text-text-faint hover:text-expense">
          ✕
        </button>
      </div>
    </Card>
  )
}

function NewEntryModal({
  open,
  onClose,
  accounts,
  categories,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  accounts: Account[]
  categories: Category[]
  onSaved: () => void
}) {
  const [tab, setTab] = useState<'expense' | 'income' | 'transfer'>('expense')

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <div className="mb-3 flex gap-1 rounded-md bg-surface-2 p-1">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium ${tab === t ? 'bg-accent text-white' : 'text-text-muted'}`}
          >
            {t === 'expense' ? 'Gasto' : t === 'income' ? 'Ingreso' : 'Transferencia'}
          </button>
        ))}
      </div>

      {tab === 'transfer' ? (
        <TransferForm accounts={accounts} onClose={onClose} onSaved={onSaved} />
      ) : (
        <TransactionForm
          kind={tab}
          accounts={accounts}
          categories={categories.filter((c) => c.kind === tab)}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  )
}

function TransactionForm({
  kind,
  accounts,
  categories,
  onClose,
  onSaved,
}: {
  kind: 'expense' | 'income'
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseAmountToCents(amount)
    if (cents === null || !accountId) return
    setSaving(true)
    setError(null)
    try {
      await createTransaction({
        accountId,
        categoryId: categoryId || null,
        amountCents: kind === 'expense' ? -Math.abs(cents) : Math.abs(cents),
        occurredAt: date,
        note: note || undefined,
      })
      onClose()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length === 0) return <EmptyState message="Primero crea una cuenta." />

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input placeholder="Importe" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.icon} {a.name}
          </option>
        ))}
      </Select>
      <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Sin categoría</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </Select>
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p className="text-xs text-expense">{error}</p>}
      <Button type="submit" disabled={saving || !amount}>
        {saving ? 'Guardando…' : 'Registrar'}
      </Button>
    </form>
  )
}

function TransferForm({ accounts, onClose, onSaved }: { accounts: Account[]; onClose: () => void; onSaved: () => void }) {
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? '')
  const [destId, setDestId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cents = parseAmountToCents(amount)
    if (cents === null) return
    setSaving(true)
    try {
      await createTransfer({ sourceAccountId: sourceId, destinationAccountId: destId, amountCents: cents, occurredAt: date })
      onClose()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length < 2) return <EmptyState message="Necesitas al menos dos cuentas para transferir." />

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            Desde: {a.icon} {a.name}
          </option>
        ))}
      </Select>
      <Select value={destId} onChange={(e) => setDestId(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            Hacia: {a.icon} {a.name}
          </option>
        ))}
      </Select>
      <Input placeholder="Importe" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {error && <p className="text-xs text-expense">{error}</p>}
      <Button type="submit" disabled={saving || !amount}>
        {saving ? 'Guardando…' : 'Transferir'}
      </Button>
    </form>
  )
}
