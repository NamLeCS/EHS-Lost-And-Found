import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  apiErrorMessage,
  createMissingReport,
} from '../lib/api'
import { getStoredReports, saveReport } from '../lib/storage'
import { EmptyState } from '../components/EmptyState'
import { FieldError } from '../components/FieldError'
import { Spinner } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'

export function ReportsPage() {
  const { user } = useAuth()
  const [refresh, setRefresh] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [colors, setColors] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [dateLost, setDateLost] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reports = useMemo(() => {
    void refresh
    return getStoredReports().filter((r) => r.user_id === user?.id)
  }, [user?.id, refresh])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!category.trim()) next.category = 'Category is required.'
    if (!dateLost.trim()) next.dateLost = 'Date lost is required.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      const payload = {
        category: category.trim(),
        brand: brand.trim(),
        colors: colors.trim(),
        description: description.trim(),
        location: location.trim(),
        time: dateLost.trim(),
      }
      const id = await createMissingReport(payload)
      saveReport({
        ...payload,
        id,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        user_id: user!.id,
      })
      setCategory('')
      setBrand('')
      setColors('')
      setDescription('')
      setLocation('')
      setDateLost('')
      setRefresh((x) => x + 1)
      toast.success('Missing report filed — check for matches anytime.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create report'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My missing reports</h1>
        <p className="mt-1 text-slate-600">
          Tell us what you lost. We will compare your report to items turned in at the office.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">File a new report</h2>
        <p className="mt-1 text-sm text-slate-600">
          Colors can be comma-separated, e.g. <span className="font-mono text-slate-800">navy,white</span>.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none ring-brand-500/25 focus:border-brand-500 focus:bg-white focus:ring-4"
              placeholder="e.g. Water bottle, Jacket, Calculator"
            />
            <FieldError message={errors.category} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Brand</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none ring-brand-500/25 focus:border-brand-500 focus:bg-white focus:ring-4"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Colors</label>
            <input
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none ring-brand-500/25 focus:border-brand-500 focus:bg-white focus:ring-4"
              placeholder="red, black"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none ring-brand-500/25 focus:border-brand-500 focus:bg-white focus:ring-4"
              placeholder="Notable details, scratches, stickers, initials…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Last seen location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none ring-brand-500/25 focus:border-brand-500 focus:bg-white focus:ring-4"
              placeholder="Gym, Library, Bus 12…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Date lost</label>
            <input
              value={dateLost}
              onChange={(e) => setDateLost(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none ring-brand-500/25 focus:border-brand-500 focus:bg-white focus:ring-4"
              placeholder="e.g. 2026-03-10 or “Monday”"
            />
            <FieldError message={errors.dateLost} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting && <Spinner className="size-4 border-2 border-white/40 border-t-white" />}
              Submit report
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Your reports</h2>
        {reports.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No missing reports yet"
              message="File one above — we will keep an eye out and show possible matches when items are turned in."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-md shadow-slate-200/40 ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.category}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {[r.brand, r.colors, r.location].filter(Boolean).join(' · ') || 'No extra details'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.description}</p>
                </div>
                <Link
                  to={`/reports/${r.id}/matches`}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-100"
                >
                  View matches
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
