export function Skeleton({ className = '', style }) {
  return <div aria-hidden="true" className={`vl-skeleton ${className}`} style={style} />
}

// Matches a stat card: label, big number, caption.
export function StatCardSkeleton() {
  return (
    <div className="vl-card p-5" aria-hidden="true">
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="mb-3 h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function ChartSkeleton({ height = 260 }) {
  return (
    <div className="vl-card p-6" aria-hidden="true">
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-6 h-3 w-56" />
      <Skeleton className="w-full" style={{ height }} />
    </div>
  )
}

export function RowsSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3.5 w-48 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
