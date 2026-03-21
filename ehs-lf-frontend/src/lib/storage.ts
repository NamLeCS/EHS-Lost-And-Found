/**
 * The FastAPI backend in this repo does not expose GET list endpoints for
 * reports, found items, or claims. We persist records created through this
 * app in localStorage so list views work in the browser session.
 */
import type { StoredClaim, StoredFoundItem, StoredMissingReport } from '../types/api'

const REPORTS = 'ehs_lf_reports'
const FOUND = 'ehs_lf_found_items'
const CLAIMS = 'ehs_lf_claims'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const STORAGE_EVENT = 'ehs_lf_storage'

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new Event(STORAGE_EVENT))
}

export function getStoredReports(): StoredMissingReport[] {
  return readJson<StoredMissingReport[]>(REPORTS, [])
}

export function saveReport(entry: StoredMissingReport) {
  const all = getStoredReports().filter((r) => r.id !== entry.id)
  all.unshift(entry)
  writeJson(REPORTS, all)
}

export function removeReport(id: number) {
  const all = getStoredReports().filter((r) => r.id !== id)
  writeJson(REPORTS, all)
}

/** Clears cached missing reports (localStorage). Use after wiping the DB or to fix stale IDs. */
export function clearAllStoredReports() {
  writeJson(REPORTS, [])
}

/** Clears cached claims (localStorage). Optional follow-up when clearing all reports. */
export function clearAllStoredClaims() {
  writeJson(CLAIMS, [])
}

export function getStoredFoundItems(): StoredFoundItem[] {
  return readJson<StoredFoundItem[]>(FOUND, [])
}

export function saveFoundItem(entry: StoredFoundItem) {
  const all = getStoredFoundItems().filter((r) => r.id !== entry.id)
  all.unshift(entry)
  writeJson(FOUND, all)
}

export function getStoredClaims(): StoredClaim[] {
  return readJson<StoredClaim[]>(CLAIMS, [])
}

export function saveClaim(entry: StoredClaim) {
  const all = getStoredClaims().filter((c) => c.claim_id !== entry.claim_id)
  all.unshift(entry)
  writeJson(CLAIMS, all)
}

export function updateClaimStatus(claimId: number, status: string) {
  const all = getStoredClaims().map((c) =>
    c.claim_id === claimId ? { ...c, status } : c,
  )
  writeJson(CLAIMS, all)
}
