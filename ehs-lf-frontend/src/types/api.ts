export type UserRole = 'student' | 'admin'

export interface AuthUser {
  id: number
  /** Display name — maps to backend `email` (no username field on API). */
  username: string
  is_admin: boolean
}

export interface MissingReportPayload {
  category: string
  brand: string
  colors: string
  description: string
  location: string
  /** Backend field name is `time` (e.g. date lost). */
  time: string
}

export interface StoredMissingReport extends MissingReportPayload {
  id: number
  status: string
  createdAt: string
  user_id: number
}

export interface StoredFoundItem extends MissingReportPayload {
  id: number
  status: string
  createdAt: string
}

export interface MatchRow {
  id: number
  found_item_id: number
  score: number
  status: string
}

export interface StoredClaim {
  claim_id: number
  match_id: number
  report_id: number
  status: string
  createdAt: string
  user_id: number
}
