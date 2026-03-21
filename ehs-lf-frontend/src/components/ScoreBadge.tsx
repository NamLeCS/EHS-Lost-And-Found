import { scorePercent } from '../lib/score'

export function ScoreBadge({ score }: { score: number }) {
  const pct = scorePercent(score)
  const cls =
    pct >= 70
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : pct >= 40
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : 'bg-red-50 text-red-800 ring-red-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
    >
      {pct}% match
    </span>
  )
}
