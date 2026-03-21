export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block size-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600">
      <Spinner />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
