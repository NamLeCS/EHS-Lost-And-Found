import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  apiErrorMessage,
  createClaim,
  fetchMatches,
} from '../lib/api'
import { getStoredReports, removeReport, saveClaim } from '../lib/storage'
import { EmptyState } from '../components/EmptyState'
import { PageLoader, Spinner } from '../components/Spinner'
import { ScoreBadge } from '../components/ScoreBadge'
import { StatusBadge } from '../components/StatusBadge'

export function ReportMatchesPage() {
  const { id } = useParams()
  const reportId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [rows, setRows] = useState<
    { id: number; found_item_id: number; score: number; status: string }[]
  >([])

  const report = getStoredReports().find((r) => r.id === reportId)

  const load = useCallback(async () => {
    if (!Number.isFinite(reportId)) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchMatches(reportId)
      setRows(data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        removeReport(reportId)
        toast.error(
          'This report is not on the server anymore (for example after a database reset). It was removed from your list.',
        )
        navigate('/reports', { replace: true })
        return
      }
      const msg = apiErrorMessage(err, 'Could not load matches')
      setLoadError(msg)
      setRows([])
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [reportId, navigate])

  useEffect(() => {
    load()
  }, [load])

  async function handleClaim(matchId: number) {
    setClaimingId(matchId)
    try {
      const data = await createClaim(matchId)
      saveClaim({
        claim_id: data.claim_id,
        match_id: matchId,
        report_id: reportId,
        status: data.status,
        createdAt: new Date().toISOString(),
        user_id: user!.id,
      })
      toast.success('Claim submitted — staff will review it.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not submit claim'))
    } finally {
      setClaimingId(null)
    }
  }

  if (!Number.isFinite(reportId)) {
    return (
      <p className="text-center text-slate-600">
        Invalid report. <Link to="/reports" className="text-brand-600">Back to reports</Link>
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/reports"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Back to my reports
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Possible matches</h1>
          <p className="mt-1 text-slate-600">
            Report #{reportId}
            {report && (
              <>
                {' '}
                · <span className="font-medium text-slate-800">{report.category}</span>
              </>
            )}
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
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center text-red-900 shadow-sm">
          <p className="font-medium">Could not load matches</p>
          <p className="mt-1 text-sm text-red-800">{loadError}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200 hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No matches yet"
          message="When someone turns in something similar, it will appear here with a match score. Check back after new found items are logged."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Found item ID</p>
                  <p className="text-lg font-semibold text-slate-900">#{m.found_item_id}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    The office can pull up full details for this inventory number.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ScoreBadge score={m.score} />
                    <StatusBadge status={m.status} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={claimingId === m.id || m.status === 'CLAIMED'}
                  onClick={() => handleClaim(m.id)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {claimingId === m.id && (
                    <Spinner className="size-4 border-2 border-white/30 border-t-white" />
                  )}
                  {m.status === 'CLAIMED' ? 'Already claimed' : 'This is mine'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
