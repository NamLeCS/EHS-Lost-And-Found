import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { apiErrorMessage, fetchMyClaims } from '../lib/api'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'

export function ClaimsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState<
    { claim_id: number; match_id: number; report_id: number; status: string }[]
  >([])

  const load = useCallback(async () => {
    if (!token) {
      setClaims([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchMyClaims()
      setClaims(data)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load claims'))
      setClaims([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load, user?.id])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My claims</h1>
          <p className="mt-1 text-slate-600">
            Track items you have identified as yours. Staff will approve or deny each request.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : claims.length === 0 ? (
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
