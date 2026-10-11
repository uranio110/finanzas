import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAccountBalances, type AccountBalance } from '@/data/balances'
import { listTransactions } from '@/data/transactions'
import { listCategories } from '@/data/categories'
import { listTemplates, applyTemplate } from '@/data/templates'
import { formatCurrency } from '@/utils/currency'
import type { Category, QuickTemplate, Transaction } from '@/types/database'
import { Card, PageHeader, EmptyState } from '@/components/ui'

function monthRange(date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export function DashboardPage() {
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [monthTx, setMonthTx] = useState<Transaction[]>([])
  const [recent, setRecent] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<QuickTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const { from, to } = monthRange()
    const [bal, tx, cat, tpl] = await Promise.all([
      listAccountBalances(),
      listTransactions({ from, to }),
      listCategories(),
      listTemplates(),
    ])
    setBalances(bal)
    setMonthTx(tx.filter((t) => t.kind === 'normal'))
    setRecent(tx.slice(0, 6))
    setCategories(cat)
    setTemplates(tpl.slice(0, 4))
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  if (loading) return null

  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0)
  const income = monthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const net = income + expense
  const categoryOf = (id: string | null) => categories.find((c) => c.id === id)

  return (
    <div>
      <PageHeader title="Resumen" />
      {toast && <div className="mb-3 rounded-md bg-income-soft px-3 py-2 text-sm text-income">{toast}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-text-muted">Saldo disponible (todas las cuentas)</div>
          <div className="mt-1 text-2xl font-semibold text-text">{formatCurrency(totalBalance)}</div>
        </Card>
        <Card>
          <div className="text-xs text-text-muted">Ingresos del mes</div>
          <div className="mt-1 text-2xl font-semibold text-income">{formatCurrency(income)}</div>
        </Card>
        <Card>
          <div className="text-xs text-text-muted">Gastos del mes</div>
          <div className="mt-1 text-2xl font-semibold text-expense">{formatCurrency(Math.abs(expense))}</div>
        </Card>
      </div>

      <Card className="mt-3">
        <div className="text-xs text-text-muted">Balance neto del mes (ingresos − gastos)</div>
        <div className={`mt-1 text-xl font-semibold ${net >= 0 ? 'text-income' : 'text-expense'}`}>
          {net >= 0 ? '+' : ''}
          {formatCurrency(net)}
        </div>
        <p className="mt-1 text-xs text-text-faint">
          Esto es distinto al saldo disponible: aquí solo cuenta lo que entró y salió este mes.
        </p>
      </Card>

      {templates.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={async () => {
                  if (t.default_amount === null) return
                  await applyTemplate(t)
                  setToast(`Registrado: ${t.label}`)
                  setTimeout(() => setToast(null), 1500)
                  reload()
                }}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-3 hover:bg-surface-2"
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs text-text">{t.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Cuentas</h2>
          <Link to="/cuentas" className="text-xs text-accent">
            Ver todas
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {balances.map((b) => (
            <Card key={b.account_id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-text">{b.name}</span>
              <span className="text-sm font-medium text-text">{formatCurrency(b.balance)}</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Últimos movimientos</h2>
          <Link to="/movimientos" className="text-xs text-accent">
            Ver historial
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState message="Todavía no hay movimientos." />
        ) : (
          <div className="flex flex-col gap-1">
            {recent.map((t) => (
              <Card key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span>{categoryOf(t.category_id)?.icon ?? '💤'}</span>
                  <span className="text-sm text-text">{categoryOf(t.category_id)?.name ?? t.note ?? 'Movimiento'}</span>
                </div>
                <span className={`text-sm font-medium ${t.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                  {t.amount >= 0 ? '+' : ''}
                  {formatCurrency(t.amount)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
