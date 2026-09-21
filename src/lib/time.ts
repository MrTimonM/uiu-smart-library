/**
 * The library sits in Dhaka, so opening hours, due dates and booking slots are
 * Dhaka wall-clock time — not the server's timezone (Vercel runs in UTC) and
 * not the viewer's. Bangladesh is UTC+6 all year with no daylight saving, so a
 * fixed offset is exact rather than an approximation.
 */
export const LIBRARY_TZ = 'Asia/Dhaka'
export const LIBRARY_OFFSET = '+06:00'

export const OPEN_HOUR = 9
export const CLOSE_HOUR = 21
export const SLOT_HOURS = 2

/** The instant at which `hour` o'clock starts on `dateISO` in library time. */
export function libraryInstant(dateISO: string, hour: number): Date {
  const hh = String(hour).padStart(2, '0')
  return new Date(`${dateISO}T${hh}:00:00${LIBRARY_OFFSET}`)
}

/** The hour of the day an instant falls on, in library time. */
export function libraryHour(date: Date | string): number {
  const d = new Date(date)
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: LIBRARY_TZ }).format(d),
  )
}

/** The calendar date an instant falls on, in library time, as YYYY-MM-DD. */
export function libraryDate(date: Date | string = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIBRARY_TZ }).format(new Date(date))
}

/** Bookable slot start hours, e.g. 9, 11, 13, 15, 17, 19. */
export const SLOT_HOURS_OF_DAY = Array.from(
  { length: Math.floor((CLOSE_HOUR - OPEN_HOUR) / SLOT_HOURS) },
  (_, i) => OPEN_HOUR + i * SLOT_HOURS,
)
