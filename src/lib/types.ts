export type Role = 'student' | 'faculty' | 'staff'
export type TitleType = 'print' | 'ebook' | 'journal' | 'thesis'
export type CopyStatus = 'available' | 'on_loan' | 'held' | 'lost' | 'repair'
export type CopyKind = 'circulating' | 'reference' | 'reserve'
export type HoldStatus = 'queued' | 'ready' | 'collected' | 'expired' | 'cancelled'

export interface SessionUser {
  id: string
  uiu_id: string
  name: string
  email: string
  role: Role
  department: string | null
  avatar_hue: number
}

export interface TitleRow {
  id: string
  type: TitleType
  title: string
  subtitle: string | null
  isbn: string | null
  issn: string | null
  publisher: string | null
  year: number | null
  language: string
  edition: string | null
  pages: number | null
  summary: string | null
  cover_hue: number
  rating_avg: string | number
  rating_count: number
  borrow_count: number
  added_at: string
}

export interface SearchResult extends TitleRow {
  authors: string[]
  subjects: string[]
  copies_total: number
  copies_available: number
  next_due: string | null
  rank?: number
}

export interface CopyRow {
  id: string
  accession_number: string
  location_zone: string
  shelf_bay: string
  copy_type: CopyKind
  status: CopyStatus
  due_back: string | null
}

export interface LoanRow {
  id: string
  title_id: string
  title: string
  type: TitleType
  cover_hue: number
  accession_number: string
  issued_at: string
  due_at: string
  returned_at: string | null
  renewals_count: number
  authors: string[]
  queued_behind: number
}

export interface HoldRow {
  id: string
  title_id: string
  title: string
  cover_hue: number
  type: TitleType
  status: HoldStatus
  placed_at: string
  ready_at: string | null
  expires_at: string | null
  queue_position: number
  copies_total: number
}

export interface Recommendation extends SearchResult {
  score: number
  reason: string
  reason_group: 'history' | 'interests' | 'courses' | 'trending' | 'similar'
  detail: string
}

export interface NotificationRow {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  created_at: string
  read_at: string | null
}
