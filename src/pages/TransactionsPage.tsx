import { useEffect, useMemo, useState } from 'react'
import { listTransactions, createTransaction, deleteTransaction } from '@/data/transactions'
import { listTransfers, createTransfer, deleteTransfer } from '@/data/transfers'
import { listAccounts } from '@/data/accounts'
import { listCategories } from '@/data/categories'
import { formatCurrency, parseAmountToCents } from '@/utils/currency'
import { downloadCsv } from '@/utils/csv'
import { getErrorMessage } from '@/utils/errors'
import {
  type Granularity,
  getPeriodRange,
  shiftPeriod,
  formatPeriodLabel,
  toDateInputValue,
  toMonthInputValue,
  toWeekInputValue,
  dateInputValueToDate,
  monthInputValueToDate,
  weekInputValueToDate,
} from '@/utils/period'
import type { Account, Category, Transaction, Transfer } from '@/types/database'
import { Card, Button, Input, Select, Modal, EmptyState } from '@/components/ui'

type Entry = { kind: 'transaction'; data: Transaction } | { kind: 'transfer'; data: Transfer }

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toDateInputValue(d)
}

function balanceAsOf(
  accountIds: string[],
  asOfIso: string,
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
): number {
  let total = 0
  for (const id of accountIds) {
    const acc = accounts.find((a) => a.id === id)
    if (!acc) continue
    let bal = acc.opening_balance
    for (const t of transactions) if (t.account_id === id && t.occurred_at <= asOfIso) bal += t.amount
    for (const tr of transfers) {
      if (tr.occurred_at > asOfIso) continue
      if (tr.destination_account_id === id) bal += tr.amount
      if (tr.source_account_id === id) bal -= tr.amount
    }
    total += bal
  }
  return total
}

export function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const [granularity, setGranularity] = useState<Granularity>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [accountFilter, setAccountFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  async function reload() {
    setLoading(true)
    const [acc, cat, tx, tr] = await Promise.all([listAccounts(), listCategories(), listTransactions(), listTransfers()])
    setAccounts(acc)
    setCategories(cat)
    setAllTransactions(tx)
    setAllTransfers(tr)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const categoryOf = (id: string | null) => categories.find((c) => c.id === id)

  const { from, to } = getPeriodRange(granularity, anchor)
  const fromIso = toDateInputValue(from)
  const toIso = toDateInputValue(to)

  const scopeAccountIds = accountFilter ? [accountFilter] : accounts.filter((a) => a.type !== 'piggy').map((a) => a.id)

  const saldoInicial = balanceAsOf(scopeAccountIds, addDays(fromIso, -1), accounts, allTransactions, allTransfers)
  const saldoFinal = balanceAsOf(scopeAccountIds, toIso, accounts, allTransactions, allTransfers)

  const entries: Entry[] = useMemo(() => {
    const txEntries: Entry[] = allTransactions
      .filter((t) => t.occurred_at >= fromIso && t.occurred_at <= toIso)
      .filter((t) => !accountFilter || t.account_id === accountFilter)
      .filter((t) => !categoryFilter || t.category_id === categoryFilter)
      .map((t) => ({ kind: 'transaction', data: t }))
    const trEntries: Entry[] =
      categoryFilter
        ? [] // las transferencias no tienen categoría
        : allTransfers
            .filter((t) => t.occurred_at >= fromIso && t.occurred_at <= toIso)
            .filter((t) => !accountFilter || t.source_account_id === accountFilter || t.destination_account_id === accountFilter)
            .map((t) => ({ kind: 'transfer', data: t }))
    return [...txEntries, ...trEntries].sort(
      (a, b) => b.data.occurred_at.localeCompare(a.data.occurred_at) || b.data.created_at.localeCompare(a.data.created_at),
    )
  }, [allTransactions, allTransfers, fromIso, toIso, accountFilter, categoryFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of entries) {
      const list = map.get(e.data.occurred_at) ?? []
      list.push(e)
      map.set(e.data.occurred_at, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  function dayNet(dayEntries: Entry[]): number {
    return dayEntries.filter((e) => e.kind === 'transaction').reduce((s, e) => s + (e.data as Transaction).amount, 0)
  }

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
      <div className="mb-4 text-center">
        <div className="text-xs text-text-muted">Saldo disponible</div>
        <div className="text-3xl font-semibold text-text">{formatCurrency(saldoFinal)}</div>
      </div>

      <div className="mb-3 flex items-center justify-center gap-3">
        <button onClick={() => setAnchor(shiftPeriod(granularity, anchor, -1))} className="rounded-full p-2 text-lg text-text-muted hover:bg-surface-2">
          ‹
        </button>
        <PeriodPicker granularity={granularity} anchor={anchor} onChange={setAnchor} />
        <button onClick={() => setAnchor(shiftPeriod(granularity, anchor, 1))} className="rounded-full p-2 text-lg text-text-muted hover:bg-surface-2">
          ›
        </button>
      </div>

      <div className="mb-4 flex justify-center">
        <div className="flex gap-1 rounded-full bg-surface-2 p-1">
          {(['day', 'week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${granularity === g ? 'bg-accent text-white' : 'text-text-muted'}`}
            >
              {g === 'day' ? 'Día' : g === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-4 flex justify-around text-center">
        <div>
          <div className="text-xs text-text-muted">Saldo inicial</div>
          <div className="text-base font-semibold text-income">{formatCurrency(saldoInicial)}</div>
        </div>
        <div>
          <div className="text-xs text-text-muted">Saldo final</div>
          <div className="text-base font-semibold text-income">{formatCurrency(saldoFinal)}</div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-3 flex justify-end">
        <button onClick={exportCsv} disabled={entries.length === 0} className="text-xs text-accent disabled:opacity-40">
          Exportar CSV
        </button>
      </div>

      {!loading && entries.length === 0 && <EmptyState message="No hay movimientos en este período." />}

      <div className="flex flex-col gap-4 pb-20">
        {grouped.map(([date, dayEntries]) => (
          <div key={date}>
            <div className="mb-1 flex items-baseline justify-between px-1">
              <span className="text-sm text-text-muted">{formatDateHeader(date)}</span>
              <span className={`text-sm font-semibold ${dayNet(dayEntries) >= 0 ? 'text-income' : 'text-expense'}`}>
                {dayNet(dayEntries) >= 0 ? '+' : ''}
                {formatCurrency(dayNet(dayEntries))}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {dayEntries.map((e) => (
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
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg md:bottom-8 md:right-8"
        aria-label="Añadir movimiento"
      >
        +
      </button>

      <NewEntryModal open={showNew} onClose={() => setShowNew(false)} accounts={accounts} categories={categories} onSaved={reload} />
    </div>
  )
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const weekday = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]
  const month = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ][d.getMonth()]
  return `${d.getDate()} de ${month}, ${weekday}`
}

function PeriodPicker({ granularity, anchor, onChange }: { granularity: Granularity; anchor: Date; onChange: (d: Date) => void }) {
  const label = formatPeriodLabel(granularity, anchor)
  if (granularity === 'month') {
    return (
      <label className="relative">
        <span className="text-sm font-medium text-text">{label} ▾</span>
        <input
          type="month"
          value={toMonthInputValue(anchor)}
          onChange={(e) => e.target.value && onChange(monthInputValueToDate(e.target.value))}
          className="absolute inset-0 opacity-0"
        />
      </label>
    )
  }
  if (granularity === 'week') {
    return (
      <label className="relative">
        <span className="text-sm font-medium text-text">{label} ▾</span>
        <input
          type="week"
          value={toWeekInputValue(anchor)}
          onChange={(e) => e.target.value && onChange(weekInputValueToDate(e.target.value))}
          className="absolute inset-0 opacity-0"
        />
      </label>
    )
  }
  return (
    <label className="relative">
      <span className="text-sm font-medium text-text">{label} ▾</span>
      <input
        type="date"
        value={toDateInputValue(anchor)}
        onChange={(e) => e.target.value && onChange(dateInputValueToDate(e.target.value))}
        className="absolute inset-0 opacity-0"
      />
    </label>
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
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-lg">
          {isTransfer ? '🔁' : category?.icon ?? '💤'}
        </span>
        <div>
          <div className="text-sm text-text">
            {isTransfer
              ? `${accountName((entry.data as Transfer).source_account_id)} → ${accountName((entry.data as Transfer).destination_account_id)}`
              : category?.name ?? (entry.data as Transaction).note ?? 'Sin categoría'}
          </div>
          {!isTransfer && <div className="text-xs text-text-muted">{accountName((entry.data as Transaction).account_id)}</div>}
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
      <div className="mb-3 flex gap-1 rounded-xl bg-surface-2 p-1">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${tab === t ? 'bg-accent text-white' : 'text-text-muted'}`}
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
      setError(getErrorMessage(err))
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
      setError(getErrorMessage(err))
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
