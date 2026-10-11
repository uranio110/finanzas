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
import { formatCurrency } from '@/utils/currency'
import { Card, PageHeader, Select, EmptyState } from '@/components/ui'

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const PALETTE = ['#8b7cf6', '#34d399', '#fb7185', '#38bdf8', '#fbbf24', '#a3e635', '#f472b6', '#22d3ee']

export function StatsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth()) // 0-indexed
  const [rows, setRows] = useState<MonthlyCategoryTotal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMonthlyCategoryTotals(`${year}-01-01`, `${year}-12-31`)
      .then(setRows)
      .finally(() => setLoading(false))
  }, [year])

  const monthlyTotals = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_LABELS[i], Ingresos: 0, Gastos: 0 }))
    for (const r of rows) {
      const m = new Date(r.month).getMonth()
      if (r.kind === 'income') byMonth[m].Ingresos += r.total / 100
      else byMonth[m].Gastos += Math.abs(r.total) / 100
    }
    return byMonth
  }, [rows])

  const categoryBreakdown = useMemo(() => {
    const monthRows = rows.filter((r) => new Date(r.month).getMonth() === month)
    const byKind = (kind: 'income' | 'expense') =>
      monthRows
        .filter((r) => r.kind === kind)
        .map((r) => ({ name: r.category_name, value: Math.abs(r.total) / 100 }))
    return { income: byKind('income'), expense: byKind('expense') }
  }, [rows, month])

  const yearIncome = monthlyTotals.reduce((s, m) => s + m.Ingresos, 0)
  const yearExpense = monthlyTotals.reduce((s, m) => s + m.Gastos, 0)

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        action={
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        }
      />

      {loading ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <div className="text-xs text-text-muted">Total ingresos {year}</div>
              <div className="mt-1 text-xl font-semibold text-income">{formatCurrency(yearIncome * 100)}</div>
            </Card>
            <Card>
              <div className="text-xs text-text-muted">Total gastos {year}</div>
              <div className="mt-1 text-xl font-semibold text-expense">{formatCurrency(yearExpense * 100)}</div>
            </Card>
          </div>

          <Card className="mt-3">
            <h2 className="mb-3 text-sm font-semibold text-text-muted">Evolución mensual {year}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262631" />
                  <XAxis dataKey="month" stroke="#9499a8" fontSize={12} />
                  <YAxis stroke="#9499a8" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #262631', color: '#e8e8ec' }} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#34d399" radius={3} />
                  <Bar dataKey="Gastos" fill="#fb7185" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-text-muted">Distribución del mes:</span>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-36">
              {MONTH_LABELS.map((m, i) => (
                <option key={m} value={i}>
                  {m} {year}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DonutCard title="Gastos por categoría" data={categoryBreakdown.expense} />
            <DonutCard title="Ingresos por categoría" data={categoryBreakdown.income} />
          </div>
        </>
      )}
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
              <Tooltip
                formatter={(v) => formatCurrency(Number(v) * 100)}
                contentStyle={{ background: '#13131a', border: '1px solid #262631', color: '#e8e8ec' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
