import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  apiErrorMessage,
  createFoundItem,
  fetchAllFoundItems, // Added this
} from '../lib/api'
import { EmptyState } from '../components/EmptyState'
import { FieldError } from '../components/FieldError'
import { Spinner } from '../components/Spinner'
import { StatusBadge } from '../components/StatusBadge'

export function AdminFoundItemsPage() {
  const [refresh, setRefresh] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])

  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [colors, setColors] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [dateFound, setDateFound] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 1. Fetch from Database on load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await fetchAllFoundItems()
        setItems(data)
      } catch (err) {
        console.error(err)
        toast.error("Could not load found items")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [refresh])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!category.trim()) next.category = 'Category is required.'
    if (!dateFound.trim()) next.dateFound = 'Date found is required.'
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
        time: dateFound.trim(),
      }
      
      // 2. Send to REAL backend
      await createFoundItem(payload)
      
      setCategory('')
      setBrand('')
      setColors('')
      setDescription('')
      setLocation('')
      setDateFound('')
      
      setRefresh((x) => x + 1)
      toast.success('Found item logged — matching engine updated.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create found item'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Found items (Admin)</h1>
        <p className="mt-1 text-slate-600">
          Log items turned in at the office. These go directly to the database for matching.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Add found item</h2>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 ring-brand-500/25"
              placeholder="e.g. iPhone, Blue Wallet..."
            />
            <FieldError message={errors.category} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Brand</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Colors</label>
            <input
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-brand-500"
              placeholder="comma-separated"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-brand-500"
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700">Location found</label>
             <input
               value={location}
               onChange={(e) => setLocation(e.target.value)}
               className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-brand-500"
             />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700">Date found</label>
             <input
               value={dateFound}
               onChange={(e) => setDateFound(e.target.value)}
               className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-brand-500"
             />
             <FieldError message={errors.dateFound} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting && <Spinner className="size-4 border-2 border-white/40 border-t-white" />}
              Save found item
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recently logged</h2>
        {loading ? (
           <div className="mt-10 flex justify-center"><Spinner className="size-8 text-brand-600" /></div>
        ) : items.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No items found" message="The database is empty." />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">#{item.id}</span>
                  <span className="font-medium text-slate-800">{item.category}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {[item.brand, item.colors, item.location].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}