import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { healthCheck } from '../lib/api'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/80'
      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
  }`

export function Layout() {
  const { user, token, logout } = useAuth()
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    healthCheck()
      .then((r) => {
        if (!cancelled) setApiOk(!!r.ok)
      })
      .catch(() => {
        if (!cancelled) setApiOk(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <NavLink
              to={token ? '/reports' : '/login'}
              className="truncate text-lg font-bold tracking-tight text-brand-900"
            >
              EHS Lost & Found
            </NavLink>
            {apiOk !== null && (
              <span
                className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex ${
                  apiOk
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-800 ring-1 ring-red-200'
                }`}
                title="GET /health"
              >
                <span
                  className={`size-1.5 rounded-full ${apiOk ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
                API {apiOk ? 'online' : 'offline'}
              </span>
            )}
          </div>

          <nav className="flex flex-wrap items-center gap-1">
            {!token && (
              <>
                <NavLink to="/login" className={linkClass}>
                  Login
                </NavLink>
                <NavLink to="/register" className={linkClass}>
                  Register
                </NavLink>
              </>
            )}
            {token && (
              <>
                <NavLink to="/reports" className={linkClass}>
                  My reports
                </NavLink>
                <NavLink to="/claims" className={linkClass}>
                  My claims
                </NavLink>
                {user?.is_admin && (
                  <>
                    <NavLink to="/admin/found-items" className={linkClass}>
                      Found items
                    </NavLink>
                    <NavLink to="/admin/claims" className={linkClass}>
                      Review claims
                    </NavLink>
                  </>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
        {user && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-1.5 text-center text-xs text-slate-500 sm:text-left sm:px-6">
            Signed in as <span className="font-medium text-slate-700">{user.username}</span>
            {user.is_admin && (
              <span className="ml-2 rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                Admin
              </span>
            )}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
