import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { apiErrorMessage, updateClaimStatus } from '../lib/api'
import { getStoredClaims, updateClaimStatus as persistClaimStatus } from '../lib/storage'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'

export function AdminClaimsPage() {
  const [version, setVersion] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const onFocus = () => bump()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [bump])

  const claims = useMemo(() => {
    void version
    return [...getStoredClaims()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [version])

  async function setStatus(claimId: number, status: 'APPROVED' | 'DENIED') {
    setBusyId(claimId)
    try {
      await updateClaimStatus(claimId, status)
      persistClaimStatus(claimId, status)
      bump()
      toast.success(status === 'APPROVED' ? 'Claim approved' : 'Claim denied')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update claim'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Review claims</h1>
        <p className="mt-1 text-slate-600">
          Approve when the student verified ownership; deny if it does not check out.
        </p>
      </div>

      {claims.length === 0 ? (
        <EmptyState
          title="No claims in this browser"
          message="Claims created on this device appear here. For production, add GET /claims on the API so every workstation sees the same queue."
        />
      ) : (
        <ul className="space-y-4">
          {claims.map((c) => (
            <li
              key={c.claim_id}
              className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Claim #{c.claim_id}</p>
                  <p className="text-lg font-semibold text-slate-900">
                    Match #{c.match_id} · Report #{c.report_id}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted {new Date(c.createdAt).toLocaleString()} · Student user #{c.user_id}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === c.claim_id || c.status === 'APPROVED'}
                    onClick={() => setStatus(c.claim_id, 'APPROVED')}
                    className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === c.claim_id && (
                      <Spinner className="size-4 border-2 border-white/30 border-t-white" />
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.claim_id || c.status === 'DENIED'}
                    onClick={() => setStatus(c.claim_id, 'DENIED')}
                    className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
