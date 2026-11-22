// One tooltip style for every Recharts chart. Pass as <Tooltip content={<ChartTooltip />} />.
const defaultFormat = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`

export default function ChartTooltip({ active, payload, label, format = defaultFormat, labelFormatter }) {
  if (!active || !payload?.length) return null
  const title = labelFormatter ? labelFormatter(label, payload) : (label ?? payload[0]?.name)
  return (
    <div className="vl-panel min-w-[140px] px-3 py-2 text-xs">
      {title != null && title !== '' && <p className="mb-1.5 font-medium text-gray-900 dark:text-white">{title}</p>}
      {payload.map((p) => (
        <div key={`${p.dataKey}-${p.name}`} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span className="tabular font-semibold text-gray-900 dark:text-white">{format(p.value, p)}</span>
        </div>
      ))}
    </div>
  )
}
