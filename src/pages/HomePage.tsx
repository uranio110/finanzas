import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAccounts, archiveAccount } from '@/data/accounts'
import { listAccountBalances, type AccountBalance } from '@/data/balances'
import { listTransactions } from '@/data/transactions'
import { listCategories } from '@/data/categories'
import { formatCurrency } from '@/utils/currency'
import type { Account, Category, Transaction } from '@/types/database'
import { Card, PageHeader, Button, EmptyState } from '@/components/ui'
import { CreateAccountModal, AdjustBalanceModal } from '@/components/AccountModals'

function monthRange(date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [monthTx, setMonthTx] = useState<Transaction[]>([])
  const [recent, setRecent] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null)

  async function reload() {
    setLoading(true)
    const { from, to } = monthRange()
    const [acc, bal, tx, cat] = await Promise.all([
      listAccounts(),
      listAccountBalances(),
      listTransactions({ from, to }),
      listCategories(),
    ])
    setAccounts(acc)
    setBalances(bal)
    setMonthTx(tx.filter((t) => t.kind === 'normal'))
    setRecent(tx.slice(0, 6))
    setCategories(cat)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  if (loading) return null

  const balanceFor = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0
  const regularAccounts = accounts.filter((a) => a.type !== 'piggy')
  const piggyAccounts = accounts.filter((a) => a.type === 'piggy')
  // El dinero en alcancías queda apartado: no cuenta como disponible para gastar.
  const availableBalance = regularAccounts.reduce((sum, a) => sum + balanceFor(a.id), 0)

  const income = monthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const net = income + expense
  const categoryOf = (id: string | null) => categories.find((c) => c.id === id)

  return (
    <div>
      <PageHeader title="Finanzas" action={<Button onClick={() => setShowCreateAccount(true)}>+ Nueva cuenta</Button>} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-text-muted">Saldo disponible</div>
          <div className="mt-1 text-2xl font-semibold text-text">{formatCurrency(availableBalance)}</div>
          {piggyAccounts.length > 0 && <div className="mt-1 text-xs text-text-faint">No incluye alcancías</div>}
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
      </Card>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-text-muted">Cuentas</h2>
        {regularAccounts.length === 0 ? (
          <EmptyState message="Todavía no tienes cuentas. Crea la primera (efectivo, banco, ahorros...)." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regularAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                balance={balanceFor(acc.id)}
                onAdjust={() => setAdjustingAccount(acc)}
                onArchive={async () => {
                  if (confirm(`¿Archivar la cuenta "${acc.name}"? No se borra el historial.`)) {
                    await archiveAccount(acc.id)
                    reload()
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {piggyAccounts.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">Alcancías</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {piggyAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                balance={balanceFor(acc.id)}
                onAdjust={() => setAdjustingAccount(acc)}
                onArchive={async () => {
                  if (confirm(`¿Archivar la alcancía "${acc.name}"? No se borra el historial.`)) {
                    await archiveAccount(acc.id)
                    reload()
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

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

      <CreateAccountModal open={showCreateAccount} onClose={() => setShowCreateAccount(false)} onCreated={reload} />
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

function AccountCard({
  account,
  balance,
  onAdjust,
  onArchive,
}: {
  account: Account
  balance: number
  onAdjust: () => void
  onArchive: () => void
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{account.icon}</span>
        <div className="text-sm font-medium text-text">{account.name}</div>
      </div>
      <div className="text-xl font-semibold text-text">{formatCurrency(balance, account.currency)}</div>
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onAdjust}>
          Corregir saldo
        </Button>
        <Button variant="ghost" onClick={onArchive}>
          Archivar
        </Button>
      </div>
    </Card>
  )
}
