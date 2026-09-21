'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { formatDate, formatTime } from '@/lib/format'
import { SLOT_HOURS_OF_DAY, libraryInstant } from '@/lib/time'
import { IconCheck, IconClock, IconDoor } from './icons'

const SLOTS = SLOT_HOURS_OF_DAY

interface Room { id: string; name: string; capacity: number; floor: string; features: string[] }
interface Booking { id: string; room_id: string; user_id: string; slot_start: string; slot_end: string; status: string; user_name: string }

export function RoomGrid({
  rooms, bookings, date, days, userId,
}: {
  rooms: Room[]
  bookings: Booking[]
  date: string
  days: { iso: string; label: string }[]
  userId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The slot is a Dhaka wall-clock hour, so it must not be built from the
  // viewer's local timezone — a reader abroad would otherwise book a
  // different hour than the one they clicked.
  function slotISO(hour: number) {
    return libraryInstant(date, hour)
  }

  function stateOf(room: Room, hour: number) {
    const start = slotISO(hour)
    const end = new Date(start.getTime() + 2 * 3600000)
    const hit = bookings.find(
      (b) => b.room_id === room.id && new Date(b.slot_start) < end && new Date(b.slot_end) > start,
    )
    if (hit) return hit.user_id === userId ? 'yours' : 'taken'
    if (end.getTime() < Date.now()) return 'past'
    return 'free'
  }

  async function book(room: Room, hour: number) {
    const key = `${room.id}-${hour}`
    setBusy(key); setError(null)
    try {
      await api('/api/rooms/bookings', 'POST', { roomId: room.id, slotStart: slotISO(hour).toISOString() })
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium">Book before you walk over</h2>
        <div className="flex flex-wrap gap-1">
          {days.map((d) => (
            <Link
              key={d.iso}
              href={`/rooms?date=${d.iso}`}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                d.iso === date ? 'bg-brand-soft font-medium text-brand' : 'text-ink-2 hover:bg-paper-2'
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      {error && <p className="border-b border-line bg-bad-soft px-4 py-2 text-xs text-bad">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="label-eyebrow px-4 py-2.5 text-left font-semibold">Room</th>
              {SLOTS.map((h) => (
                <th key={h} className="label-eyebrow px-1 py-2.5 text-center font-semibold">
                  {String(h).padStart(2, '0')}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-b border-line-2 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{room.name}</div>
                  <div className="text-[11px] text-ink-3">
                    {room.floor} · {room.capacity} seats
                    {room.features.length > 0 && ` · ${room.features[0]}`}
                  </div>
                </td>
                {SLOTS.map((h) => {
                  const state = stateOf(room, h)
                  const key = `${room.id}-${h}`
                  return (
                    <td key={h} className="px-1 py-1.5 text-center">
                      <button
                        onClick={() => state === 'free' && book(room, h)}
                        disabled={state !== 'free' || busy === key}
                        aria-label={`${room.name} at ${h}:00 — ${state}`}
                        className={`w-full rounded-md py-2 text-[11px] font-medium transition ${
                          state === 'free' ? 'bg-ok-soft text-ok hover:bg-ok hover:text-white'
                          : state === 'yours' ? 'bg-brand-soft text-brand'
                          : state === 'taken' ? 'bg-paper-2 text-ink-3'
                          : 'bg-transparent text-ink-3/40'
                        }`}
                      >
                        {busy === key ? '…'
                          : state === 'free' ? 'Book'
                          : state === 'yours' ? 'Yours'
                          : state === 'taken' ? 'Taken'
                          : '—'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
        Two-hour slots, two per reader per day. A slot is auto-released if nobody checks in within 15 minutes.
      </p>
    </section>
  )
}

/* ============================================================ my bookings */

export function MyBookings({
  bookings,
}: {
  bookings: { id: string; room_name: string; floor: string; slot_start: string; slot_end: string; status: string; checked_in_at: string | null }[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(id: string, kind: 'checkin' | 'cancel') {
    setBusy(id); setError(null)
    try {
      if (kind === 'checkin') await api('/api/rooms/bookings', 'PATCH', { bookingId: id })
      else await api('/api/rooms/bookings', 'DELETE', { bookingId: id })
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">Your bookings</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-3">
          <IconDoor className="size-4" /> No rooms booked.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {bookings.map((b) => {
            const start = new Date(b.slot_start)
            const mins = (Date.now() - start.getTime()) / 60000
            const canCheckIn = b.status === 'booked' && mins >= -10 && mins <= 15
            return (
              <li key={b.id} className="rounded-lg border border-line px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{b.room_name}</div>
                    <div className="text-[11px] text-ink-3">
                      {formatDate(start, { year: undefined })} · {formatTime(b.slot_start)}–{formatTime(b.slot_end)}
                    </div>
                  </div>
                  {b.status === 'checked_in' ? (
                    <span className="pill bg-ok-soft text-ok"><IconCheck className="size-3" /> In</span>
                  ) : b.status === 'released' ? (
                    <span className="pill bg-paper-2 text-ink-3">Released</span>
                  ) : (
                    <span className="pill bg-brand-soft text-brand"><IconClock className="size-3" /> Booked</span>
                  )}
                </div>
                {b.status === 'booked' && (
                  <div className="mt-2 flex gap-1.5">
                    {canCheckIn && (
                      <button className="btn btn-primary px-2 py-1 text-xs" onClick={() => act(b.id, 'checkin')} disabled={busy === b.id}>
                        Check in
                      </button>
                    )}
                    <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => act(b.id, 'cancel')} disabled={busy === b.id}>
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </section>
  )
}
