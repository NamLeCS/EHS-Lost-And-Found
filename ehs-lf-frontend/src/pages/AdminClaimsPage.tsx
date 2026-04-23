import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiErrorMessage, updateClaimStatus, fetchAllClaimsForAdmin } from '../lib/api'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'

export function AdminClaimsPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await fetchAllClaimsForAdmin()
        setClaims(data)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Failed to load claims'))
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [refresh])

  async function setStatus(claimId: number, status: 'APPROVED' | 'DENIED') {
    setBusyId(claimId)
    try {
      await updateClaimStatus(claimId, status)
      setRefresh(v => v + 1) 
      toast.success(status === 'APPROVED' ? 'Claim approved' : 'Claim denied')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update claim'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="mt-10 flex justify-center"><Spinner className="size-10 text-brand-600" /></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Review claims</h1>
        <p className="mt-1 text-slate-600">Database-connected: Reviewing all student submissions.</p>
      </div>

      {claims.length === 0 ? (
        <EmptyState title="No claims found" message="All student claims have been processed." />
      ) : (
        <ul className="space-y-4">
          {claims.map((c) => (
            <li key={c.claim_id} className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/80">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Claim #{c.claim_id}</p>
                  <p className="text-lg font-semibold text-slate-900">Match #{c.match_id} · Report #{c.report_id}</p>
                  <p className="mt-1 text-xs text-slate-500">Student User #{c.user_id}</p>
                  <div className="mt-3"><StatusBadge status={c.status} /></div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busyId === c.claim_id || c.status !== 'PENDING'}
                    onClick={() => setStatus(c.claim_id, 'APPROVED')}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >Approve</button>
                  <button
                    disabled={busyId === c.claim_id || c.status !== 'PENDING'}
                    onClick={() => setStatus(c.claim_id, 'DENIED')}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >Deny</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}