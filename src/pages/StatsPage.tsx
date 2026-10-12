import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getMonthlyCategoryTotals, type MonthlyCategoryTotal } from '@/data/balances'
import { listTransactions } from '@/data/transactions'
import { formatCurrency } from '@/utils/currency'
import { toMonthInputValue, monthInputValueToDate } from '@/utils/period'
import { Card, PageHeader, Select, EmptyState } from '@/components/ui'

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const PALETTE = ['#8b7cf6', '#34d399', '#fb7185', '#38bdf8', '#fbbf24', '#a3e635', '#f472b6', '#22d3ee']
const tooltipStyle = { background: '#13131a', border: '1px solid #262631', color: '#e8e8ec', borderRadius: 12 }

export function StatsPage() {
  const [evolutionMode, setEvolutionMode] = useState<'year' | 'month'>('year')
  const [year, setYear] = useState(new Date().getFullYear())
  const [evolutionMonth, setEvolutionMonth] = useState(new Date())

  const [breakdownMonth, setBreakdownMonth] = useState(new Date())
  const [yearRows, setYearRows] = useState<MonthlyCategoryTotal[]>([])
  const [breakdownRows, setBreakdownRows] = useState<MonthlyCategoryTotal[]>([])
  const [dailyRows, setDailyRows] = useState<{ x: string; Ingresos: number; Gastos: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMonthlyCategoryTotals(`${year}-01-01`, `${year}-12-31`)
      .then(setYearRows)
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => {
    if (evolutionMode !== 'month') return
    const from = new Date(evolutionMonth.getFullYear(), evolutionMonth.getMonth(), 1)
    const to = new Date(evolutionMonth.getFullYear(), evolutionMonth.getMonth() + 1, 0)
    listTransactions({ from: toMonthInputValue(from) + '-01', to: to.toISOString().slice(0, 10) }).then((txs) => {
      const days = to.getDate()
      const rows = Array.from({ length: days }, (_, i) => ({ x: String(i + 1), Ingresos: 0, Gastos: 0 }))
      for (const t of txs) {
        if (t.kind !== 'normal') continue
        const day = Number(t.occurred_at.slice(8, 10))
        if (t.amount > 0) rows[day - 1].Ingresos += t.amount / 100
        else rows[day - 1].Gastos += Math.abs(t.amount) / 100
      }
      setDailyRows(rows)
    })
  }, [evolutionMode, evolutionMonth])

  useEffect(() => {
    const from = new Date(breakdownMonth.getFullYear(), breakdownMonth.getMonth(), 1)
    const to = new Date(breakdownMonth.getFullYear(), breakdownMonth.getMonth() + 1, 0)
    getMonthlyCategoryTotals(toMonthInputValue(from) + '-01', to.toISOString().slice(0, 10)).then(setBreakdownRows)
  }, [breakdownMonth])

  const monthlyTotals = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ x: MONTH_LABELS[i], Ingresos: 0, Gastos: 0 }))
    for (const r of yearRows) {
      const m = new Date(r.month).getMonth()
      if (r.kind === 'income') byMonth[m].Ingresos += r.total / 100
      else byMonth[m].Gastos += Math.abs(r.total) / 100
    }
    return byMonth
  }, [yearRows])

  const categoryBreakdown = useMemo(() => {
    const byKind = (kind: 'income' | 'expense') =>
      breakdownRows.filter((r) => r.kind === kind).map((r) => ({ name: r.category_name, value: Math.abs(r.total) / 100 }))
    return { income: byKind('income'), expense: byKind('expense') }
  }, [breakdownRows])

  const yearIncome = monthlyTotals.reduce((s, m) => s + m.Ingresos, 0)
  const yearExpense = monthlyTotals.reduce((s, m) => s + m.Gastos, 0)
  const monthIncome = dailyRows.reduce((s, d) => s + d.Ingresos, 0)
  const monthExpense = dailyRows.reduce((s, d) => s + d.Gastos, 0)

  return (
    <div>
      <PageHeader title="Estadísticas" />

      <Card className="mb-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Ver evolución por:</span>
          <Select value={evolutionMode} onChange={(e) => setEvolutionMode(e.target.value as 'year' | 'month')} className="w-32">
            <option value="year">Año (mensual)</option>
            <option value="month">Mes (diario)</option>
          </Select>

          {evolutionMode === 'year' ? (
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          ) : (
            <input
              type="month"
              value={toMonthInputValue(evolutionMonth)}
              onChange={(e) => e.target.value && setEvolutionMonth(monthInputValueToDate(e.target.value))}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
            />
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-text-muted">Ingresos</div>
            <div className="text-lg font-semibold text-income">
              {formatCurrency((evolutionMode === 'year' ? yearIncome : monthIncome) * 100)}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Gastos</div>
            <div className="text-lg font-semibold text-expense">
              {formatCurrency((evolutionMode === 'year' ? yearExpense : monthExpense) * 100)}
            </div>
          </div>
        </div>

        {!loading && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolutionMode === 'year' ? monthlyTotals : dailyRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262631" />
                <XAxis dataKey="x" stroke="#9499a8" fontSize={12} />
                <YAxis stroke="#9499a8" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v) * 100)} />
                <Legend />
                <Bar dataKey="Ingresos" fill="#34d399" radius={4} />
                <Bar dataKey="Gastos" fill="#fb7185" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm text-text-muted">Distribución por categoría:</span>
        <input
          type="month"
          value={toMonthInputValue(breakdownMonth)}
          onChange={(e) => e.target.value && setBreakdownMonth(monthInputValueToDate(e.target.value))}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DonutCard title="Gastos por categoría" data={categoryBreakdown.expense} />
        <DonutCard title="Ingresos por categoría" data={categoryBreakdown.income} />
      </div>
    </div>
  )
}

function DonutCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text-muted">{title}</h2>
      {data.length === 0 ? (
        <EmptyState message="Sin datos para este mes." />
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v) * 100)} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
