import { getBookingsForDate, getMyBookings, getOccupancy, getRooms } from '@/lib/queries'
import { releaseStaleBookings } from '@/lib/circulation'
import { requireUser } from '@/lib/session'
import { SectionHead, Stat } from '@/components/ui'
import { RoomGrid, MyBookings } from '@/components/room-booking'
import { FloorPlan } from '@/components/floor-plan'
import { formatDate } from '@/lib/format'
import { libraryDate, libraryInstant } from '@/lib/time'

export const metadata = { title: 'Study rooms' }

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser()

  // Stands in for the scheduled auto-release job described in the plan.
  await releaseStaleBookings()

  const sp = await searchParams
  // Dates here are library calendar days, so they are derived in Dhaka time
  // rather than from the server clock (Vercel runs in UTC).
  const todayISO = libraryDate()
  const date = sp.date ?? todayISO

  const [rooms, bookings, mine, occupancy] = await Promise.all([
    getRooms(),
    getBookingsForDate(date),
    getMyBookings(user.id),
    getOccupancy(),
  ])

  const totalSeats = occupancy.latest.reduce((s, z) => s + z.seats_total, 0)
  const takenSeats = occupancy.latest.reduce((s, z) => s + z.seats_taken, 0)
  const hall = occupancy.latest.find((z) => z.zone === 'Reading Hall')
  const peak = occupancy.byHour.reduce((a, b) => (b.pct > a.pct ? b : a), { hour: 17, pct: 0 })

  const days = Array.from({ length: 5 }, (_, i) => {
    const iso = libraryDate(new Date(libraryInstant(todayISO, 12).getTime() + i * 86400000))
    return {
      iso,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDate(libraryInstant(iso, 12), { year: undefined }),
    }
  })

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHead
        eyebrow="Facilities"
        title="Study rooms & live occupancy"
        sub="Six bookable spaces in two-hour slots between 09:00 and 21:00. Check in within 15 minutes or the slot is released."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Reading hall"
          value={hall ? `${hall.seats_taken} / ${hall.seats_total}` : '—'}
          hint="seats taken right now"
          tone={hall && hall.seats_taken / hall.seats_total > 0.85 ? 'bad' : 'default'}
        />
        <Stat label="Across the library" value={`${Math.round((takenSeats / Math.max(1, totalSeats)) * 100)}%`} hint={`${takenSeats} of ${totalSeats} seats`} />
        <Stat label="Busiest hour" value={`${String(peak.hour).padStart(2, '0')}:00`} hint="plan around the evening peak" />
        <Stat label="Your bookings" value={mine.filter((b) => b.status !== 'released').length} hint="upcoming slots" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <RoomGrid rooms={rooms} bookings={bookings} date={date} days={days} userId={user.id} />
          <FloorPlan occupancy={occupancy.latest} rooms={rooms} bookings={bookings} />
        </div>

        <aside className="space-y-5">
          <MyBookings bookings={mine} />

          {/* ------------------------------------------ busiest hours */}
          <section className="card p-4">
            <h2 className="text-sm font-medium">Busiest hours</h2>
            <p className="mt-0.5 text-xs text-ink-3">Average occupancy over the last 7 days.</p>
            <div className="mt-3 flex h-28 items-end gap-[3px]">
              {occupancy.byHour.filter((h) => h.hour >= 8 && h.hour <= 21).map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-[2px] transition ${h.pct > 75 ? 'bg-bad' : h.pct > 50 ? 'bg-warn' : 'bg-brand'}`}
                    style={{ height: `${Math.max(3, h.pct)}%` }}
                    title={`${String(h.hour).padStart(2, '0')}:00 — ${h.pct}% full`}
                  />
                  <span className="text-[8px] tabular-nums text-ink-3">
                    {h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------ zones */}
          <section className="card p-4">
            <h2 className="text-sm font-medium">Live seat count</h2>
            <ul className="mt-3 space-y-2.5">
              {occupancy.latest.map((z) => {
                const pct = Math.round((z.seats_taken / Math.max(1, z.seats_total)) * 100)
                return (
                  <li key={z.zone}>
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="text-ink-2">{z.zone}</span>
                      <span className="tabular-nums font-medium">{z.seats_taken}<span className="text-ink-3">/{z.seats_total}</span></span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                      <div className={`h-full rounded-full ${pct > 85 ? 'bg-bad' : pct > 60 ? 'bg-warn' : 'bg-ok'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
