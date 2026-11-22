import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartTooltip from './ChartTooltip'
import Icon from './ui/Icon'
import { getCategoryColor } from '../utils/categories'

const money = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-IN')}`
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

function Delta({ current, previous, goodWhenDown }) {
  if (!previous) return <span className="text-xs text-gray-400">No data last month</span>
  const pct = ((current - previous) / previous) * 100
  const up = pct >= 0
  const good = goodWhenDown ? !up : up
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      <Icon name={up ? 'trendUp' : 'trendDown'} size={13} />
      {Math.abs(pct).toFixed(0)}% vs last month
    </span>
  )
}

/** Right-hand summary rail on the Transactions page. */
export default function TransactionsRail({ transactions, onQuickFilter, activeCategory }) {
  const { breakdown, expenseTotal, thisMonth, lastMonth } = useMemo(() => {
    const now = new Date()
    const cur = ym(now)
    const prev = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const sum = { [cur]: { income: 0, expense: 0 }, [prev]: { income: 0, expense: 0 } }
    const cats = new Map()
    let total = 0
    transactions.forEach((t) => {
      const amount = Number(t.amount) || 0
      const key = String(t.date || '').slice(0, 7)
      if (sum[key]) sum[key][t.type === 'income' ? 'income' : 'expense'] += amount
      if (t.type === 'expense' && key === cur) {
        const name = t.category || 'Uncategorised'
        cats.set(name, (cats.get(name) || 0) + amount)
        total += amount
      }
    })
    const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 5).map(([name, value]) => ({ name, value }))
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0)
    if (rest > 0) top.push({ name: 'Everything else', value: rest })
    return { breakdown: top, expenseTotal: total, thisMonth: sum[cur], lastMonth: sum[prev] }
  }, [transactions])

  const chip = 'vl-focus rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-indigo-500 dark:hover:text-white'
  const topCategory = breakdown.find((b) => b.name !== 'Everything else')

  return (
    <div className="space-y-6">
      <section className="vl-card p-5" aria-labelledby="rail-cats">
        <h2 id="rail-cats" className="text-sm font-semibold text-gray-900 dark:text-white">Spending this month</h2>
        <p className="mb-3 text-xs text-gray-500">Expense categories</p>
        {breakdown.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">No expenses recorded this month.</p>
        ) : (
          <>
            <div className="relative mx-auto h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
                    {breakdown.map((b) => <Cell key={b.name} fill={b.name === 'Everything else' ? '#94a3b8' : getCategoryColor(b.name)} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip format={money} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-gray-400">Total</span>
                <span className="tabular text-sm font-bold text-gray-900 dark:text-white">{money(expenseTotal)}</span>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {breakdown.map((b) => (
                <li key={b.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.name === 'Everything else' ? '#94a3b8' : getCategoryColor(b.name) }} />
                  <span className={`flex-1 truncate ${activeCategory === b.name ? 'font-semibold text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300'}`}>{b.name}</span>
                  <span className="tabular text-gray-500">{expenseTotal ? Math.round((b.value / expenseTotal) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="vl-card p-5" aria-labelledby="rail-compare">
        <h2 id="rail-compare" className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">This month vs last</h2>
        <div className="space-y-4">
          {[
            ['Expenses', thisMonth.expense, lastMonth.expense, true],
            ['Income', thisMonth.income, lastMonth.income, false],
          ].map(([label, cur, prev, goodWhenDown]) => (
            <div key={label}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="tabular text-sm font-semibold text-gray-900 dark:text-white">{money(cur)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full vl-muted-bg" aria-hidden="true">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(cur, prev) ? (cur / Math.max(cur, prev)) * 100 : 0)}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <Delta current={cur} previous={prev} goodWhenDown={goodWhenDown} />
                <span className="tabular text-xs text-gray-400">Last: {money(prev)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="vl-card p-5" aria-labelledby="rail-quick">
        <h2 id="rail-quick" className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Quick filters</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip} onClick={() => onQuickFilter({ datePreset: 'thisMonth' })}>This month</button>
          <button type="button" className={chip} onClick={() => onQuickFilter({ datePreset: 'last30' })}>Last 30 days</button>
          <button type="button" className={chip} onClick={() => onQuickFilter({ type: 'expense' })}>Expenses</button>
          <button type="button" className={chip} onClick={() => onQuickFilter({ type: 'income' })}>Income</button>
          <button type="button" className={chip} onClick={() => onQuickFilter({ sort: 'highest' })}>Largest first</button>
          {topCategory && (
            <button type="button" className={chip} onClick={() => onQuickFilter({ category: topCategory.name })}>Top: {topCategory.name}</button>
          )}
        </div>
      </section>
    </div>
  )
}
