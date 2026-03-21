import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStoredClaims, STORAGE_EVENT } from '../lib/storage'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'

export function ClaimsPage() {
  const { user } = useAuth()
  const [version, setVersion] = useState(0)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const onStorage = () => bump()
    const onFocus = () => bump()
    const onLocal = () => bump()
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    window.addEventListener(STORAGE_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(STORAGE_EVENT, onLocal)
    }
  }, [bump])

  const claims = useMemo(() => {
    void version
    return getStoredClaims().filter((c) => c.user_id === user?.id)
  }, [user?.id, version])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My claims</h1>
        <p className="mt-1 text-slate-600">
          Track items you have identified as yours. Staff will approve or deny each request.
        </p>
      </div>

      {claims.length === 0 ? (
        <EmptyState
          title="No claims yet"
          message="Open a missing report, review matches, and tap “This is mine” to submit a claim."
        />
      ) : (
        <ul className="space-y-3">
          {claims.map((c) => (
            <li
              key={c.claim_id}
              className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-md shadow-slate-200/40 ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-slate-500">Claim #{c.claim_id}</p>
                <p className="font-semibold text-slate-900">
                  Match #{c.match_id} · Report #{c.report_id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={c.status} />
                <Link
                  to={`/reports/${c.report_id}/matches`}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  View report matches
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
