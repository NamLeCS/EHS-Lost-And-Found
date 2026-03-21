const styles: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  DENIED: 'bg-red-50 text-red-800 ring-red-200',
  ACTIVE: 'bg-blue-50 text-blue-800 ring-blue-200',
  SUGGESTED: 'bg-slate-50 text-slate-700 ring-slate-200',
  CLAIMED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  UNCLAIMED: 'bg-slate-50 text-slate-600 ring-slate-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase()
  const cls = styles[key] ?? 'bg-slate-50 text-slate-700 ring-slate-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  )
}
