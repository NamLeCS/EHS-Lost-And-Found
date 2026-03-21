import axios, { type AxiosError } from 'axios'
import type { AuthUser, MissingReportPayload } from '../types/api'

const PENDING_IDENTITY_KEY = 'ehs_lf_pending_identity'
const AUTH_KEY = 'ehs_lf_auth'

export function getApiBase(): string {
  return import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '/api' : 'http://localhost:8000')
}

export const api = axios.create({
  baseURL: getApiBase(),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem(AUTH_KEY)
  if (raw) {
    try {
      const { token } = JSON.parse(raw) as { token: string }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      /* ignore */
    }
  }
  return config
})

export function loadAuthFromStorage(): { token: string; user: AuthUser } | null {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as { token: string; user: AuthUser }
  } catch {
    return null
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(PENDING_IDENTITY_KEY)
}

/** After register, backend returns id/email/role — used on next login to build `user`. */
export function savePendingIdentity(payload: {
  id: number
  email: string
  role: string
}) {
  localStorage.setItem(PENDING_IDENTITY_KEY, JSON.stringify(payload))
}

export function readPendingIdentity(): {
  id: number
  email: string
  role: string
} | null {
  const raw = localStorage.getItem(PENDING_IDENTITY_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as { id: number; email: string; role: string }
  } catch {
    return null
  }
}

export function clearPendingIdentity() {
  localStorage.removeItem(PENDING_IDENTITY_KEY)
}

export async function registerRequest(
  email: string,
  password: string,
  role: 'student' | 'admin',
) {
  const { data } = await api.post<{ id: number; email: string; role: string }>(
    '/register',
    { email, password, role },
  )
  return data
}

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<{ token: string }>('/login', {
    email,
    password,
  })
  return data.token
}

export async function createMissingReport(payload: MissingReportPayload) {
  const { data } = await api.post<{ report_id: number }>('/missing-reports', payload)
  return data.report_id
}

export async function createFoundItem(payload: MissingReportPayload) {
  const { data } = await api.post<{ found_item_id: number }>('/found-items', payload)
  return data.found_item_id
}

export async function fetchMatches(reportId: number) {
  const { data } = await api.get<
    { id: number; found_item_id: number; score: number; status: string }[]
  >(`/matches/${reportId}`)
  return data
}

export async function createClaim(matchId: number) {
  const { data } = await api.post<{ claim_id: number; status: string }>('/claims', {
    match_id: matchId,
    answers_json: '{}',
  })
  return data
}

/** Backend expects `status` as a query parameter, not JSON body. */
export async function updateClaimStatus(
  claimId: number,
  status: 'APPROVED' | 'DENIED' | 'PENDING',
) {
  const { data } = await api.patch<{ claim_id: number; status: string }>(
    `/claims/${claimId}?status=${encodeURIComponent(status)}`,
  )
  return data
}

export async function healthCheck() {
  const { data } = await api.get<{ ok: boolean }>('/health')
  return data
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const ax = err as AxiosError<{ detail?: string | { msg: string }[] }>
  const d = ax.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return d.map((x) => x.msg).join(', ')
  return ax.message || fallback
}
