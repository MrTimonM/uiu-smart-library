/**
 * Floor plan — shows the zones, the stacks and which rooms are free right now.
 * A schematic rather than a survey drawing: it only has to orient a reader
 * who is deciding where to sit.
 */
export function FloorPlan({
  occupancy, rooms, bookings,
}: {
  occupancy: { zone: string; seats_total: number; seats_taken: number }[]
  rooms: { id: string; name: string; floor: string }[]
  bookings: { room_id: string; slot_start: string; slot_end: string; status: string }[]
}) {
  const now = Date.now()
  const busyNow = new Set(
    bookings
      .filter((b) => new Date(b.slot_start).getTime() <= now && new Date(b.slot_end).getTime() > now)
      .map((b) => b.room_id),
  )

  const zone = (name: string) => occupancy.find((z) => z.zone === name)
  const pct = (name: string) => {
    const z = zone(name)
    return z ? z.seats_taken / Math.max(1, z.seats_total) : 0
  }
  const fill = (p: number) =>
    p > 0.85 ? 'var(--color-bad)' : p > 0.6 ? 'var(--color-warn)' : 'var(--color-ok)'

  const ZONES = [
    { name: 'Reading Hall', x: 8, y: 58, w: 150, h: 74 },
    { name: 'Stacks A', x: 166, y: 58, w: 74, h: 34 },
    { name: 'Stacks B', x: 166, y: 98, w: 74, h: 34 },
    { name: 'Reference', x: 248, y: 58, w: 64, h: 34 },
    { name: 'Periodicals', x: 248, y: 98, w: 64, h: 34 },
  ]

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium">Floor plan</h2>
        <span className="flex items-center gap-3 text-[11px] text-ink-3">
          {[['var(--color-ok)', 'quiet'], ['var(--color-warn)', 'filling'], ['var(--color-bad)', 'full']].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px]" style={{ background: c }} /> {l}
            </span>
          ))}
        </span>
      </div>

      <div className="overflow-x-auto p-4">
        <svg viewBox="0 0 320 190" className="h-auto w-full min-w-[420px]" role="img" aria-label="Library floor plan with live occupancy">
          {/* outer wall */}
          <rect x="4" y="4" width="312" height="182" rx="6" fill="none" stroke="var(--color-line)" strokeWidth="1.5" />

          {/* entrance + desk */}
          <rect x="8" y="10" width="70" height="20" rx="3" fill="var(--color-brand-soft)" />
          <text x="43" y="23" textAnchor="middle" className="fill-brand" style={{ fontSize: 7, fontWeight: 600 }}>Entrance</text>
          <rect x="86" y="10" width="86" height="20" rx="3" fill="var(--color-paper-2)" stroke="var(--color-line)" />
          <text x="129" y="23" textAnchor="middle" className="fill-ink-2" style={{ fontSize: 7 }}>Circulation desk</text>

          {/* zones */}
          {ZONES.map((z) => {
            const p = pct(z.name)
            const data = zone(z.name)
            return (
              <g key={z.name}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={fill(p)} opacity={0.14} />
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill="none" stroke={fill(p)} strokeWidth="1.2" />
                {/* fill bar */}
                <rect x={z.x + 6} y={z.y + z.h - 10} width={(z.w - 12) * p} height="4" rx="2" fill={fill(p)} />
                <rect x={z.x + 6} y={z.y + z.h - 10} width={z.w - 12} height="4" rx="2" fill={fill(p)} opacity={0.2} />
                <text x={z.x + 6} y={z.y + 13} className="fill-ink" style={{ fontSize: 7.5, fontWeight: 600 }}>{z.name}</text>
                {data && (
                  <text x={z.x + 6} y={z.y + 23} className="fill-ink-3" style={{ fontSize: 6.5 }}>
                    {data.seats_taken} of {data.seats_total} seats
                  </text>
                )}
              </g>
            )
          })}

          {/* stack lines inside the stacks zones */}
          {[62, 102].map((y) =>
            Array.from({ length: 5 }, (_, i) => (
              <rect key={`${y}-${i}`} x={188 + i * 10} y={y + 20} width="4" height="8" rx="1" fill="var(--color-ink-3)" opacity={0.3} />
            )),
          )}

          {/* bookable rooms along the bottom */}
          {rooms.slice(0, 6).map((r, i) => {
            const busy = busyNow.has(r.id)
            return (
              <g key={r.id}>
                <rect
                  x={8 + i * 51} y={142} width={46} height={36} rx="3"
                  fill={busy ? 'var(--color-warn)' : 'var(--color-ok)'} opacity={0.15}
                />
                <rect
                  x={8 + i * 51} y={142} width={46} height={36} rx="3"
                  fill="none" stroke={busy ? 'var(--color-warn)' : 'var(--color-ok)'} strokeWidth="1.2"
                />
                <text x={31 + i * 51} y={157} textAnchor="middle" className="fill-ink" style={{ fontSize: 6, fontWeight: 600 }}>
                  {r.name.replace('Discussion Room', 'DR').replace('Group Study Room', 'GSR').replace('Silent Study Pod', 'Pod').replace('Seminar Room', 'Seminar')}
                </text>
                <text
                  x={31 + i * 51} y={168} textAnchor="middle"
                  className={busy ? 'fill-warn' : 'fill-ok'} style={{ fontSize: 6, fontWeight: 600 }}
                >
                  {busy ? 'in use' : 'free'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
