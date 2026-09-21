import { LIBRARY_TZ, libraryDate, libraryInstant } from './time'

export const TAKA = '৳'

export function money(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  return `${TAKA}${n.toLocaleString('en-BD', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}

const DAY = 86400000

/**
 * Midnight at the start of the library's calendar day containing `d`.
 * Anchored to Dhaka so that "overdue" means the same thing on the server
 * (Vercel runs in UTC) and in a reader's browser anywhere in the world.
 */
export function startOfDay(d: Date | string): Date {
  return libraryInstant(libraryDate(d), 0)
}

/** Whole library days from today to the given date. Negative = in the past. */
export function daysUntil(date: Date | string): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / DAY)
}

export function formatDate(date: Date | string | null, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: LIBRARY_TZ, ...opts,
  })
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LIBRARY_TZ,
  })
}

export function relativeDay(date: Date | string | null): string {
  if (!date) return '—'
  const d = daysUntil(date)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  if (d > 0) return `in ${d} days`
  return `${Math.abs(d)} days ago`
}

export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const d = Math.floor(hrs / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(date, { year: undefined })
}

export const TYPE_LABEL: Record<string, string> = {
  print: 'Print book',
  ebook: 'E-book',
  journal: 'Journal',
  thesis: 'UIU thesis',
}

export const TYPE_SHORT: Record<string, string> = {
  print: 'Print',
  ebook: 'E-book',
  journal: 'Journal',
  thesis: 'Thesis',
}

export function initials(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, '')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function authorLine(authors: string[] | null | undefined, max = 2): string {
  if (!authors || authors.length === 0) return 'Unknown author'
  if (authors.length <= max) return authors.join(', ')
  return `${authors.slice(0, max).join(', ')} +${authors.length - max}`
}
