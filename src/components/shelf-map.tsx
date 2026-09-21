import type { CopyRow } from '@/lib/types'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const BAYS = 24

/**
 * Shelf map — highlights the exact bay so a reader can walk straight to it.
 * The grid is the library's own bay numbering (row letter + bay number); only
 * bays holding a copy of this title are marked, and colour tells you whether
 * the copy is actually on the shelf.
 */
export function ShelfMap({ copies }: { copies: CopyRow[] }) {
  const zones = [...new Set(copies.map((c) => c.location_zone))]

  return (
    <div className="mt-4 space-y-3">
      {zones.map((zone) => {
        const here = copies.filter((c) => c.location_zone === zone)
        const marks = new Map<string, CopyRow[]>()
        for (const c of here) {
          const list = marks.get(c.shelf_bay) ?? []
          list.push(c)
          marks.set(c.shelf_bay, list)
        }

        return (
          <figure key={zone} className="card overflow-hidden p-0">
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">{zone}</span>
              <span className="flex items-center gap-3 text-[11px] text-ink-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[2px] bg-ok" /> on shelf
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[2px] bg-warn" /> out / held
                </span>
              </span>
            </figcaption>

            <div className="overflow-x-auto p-4">
              <div className="min-w-[520px]">
                {/* bay numbers */}
                <div className="mb-1 flex gap-[3px] pl-5">
                  {Array.from({ length: BAYS }, (_, i) => (
                    <span key={i} className="w-[15px] text-center text-[8px] tabular-nums text-ink-3">
                      {(i + 1) % 4 === 1 ? i + 1 : ''}
                    </span>
                  ))}
                </div>

                {ROWS.map((row) => (
                  <div key={row} className="mb-[3px] flex items-center gap-[3px]">
                    <span className="w-5 text-[10px] font-medium text-ink-3">{row}</span>
                    {Array.from({ length: BAYS }, (_, i) => {
                      const bay = `${row}-${i + 1}`
                      const hits = marks.get(bay)
                      const hasFree = hits?.some((c) => c.status === 'available')
                      return (
                        <span
                          key={bay}
                          title={hits ? `${bay} — ${hits.map((c) => c.accession_number).join(', ')}` : bay}
                          className={`h-4 w-[15px] rounded-[2px] transition ${
                            hasFree ? 'bg-ok ring-2 ring-ok/30'
                            : hits ? 'bg-warn ring-2 ring-warn/30'
                            : 'bg-paper-2'
                          }`}
                        >
                          <span className="sr-only">
                            {hits ? `Bay ${bay}: ${hits.length} copy here` : ''}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line px-4 py-2.5 text-xs text-ink-2">
              {[...marks.entries()].map(([bay, list]) => (
                <span key={bay} className="mr-4 inline-block">
                  <span className="font-medium">{bay}</span>
                  <span className="text-ink-3"> — {list.length} {list.length === 1 ? 'copy' : 'copies'}</span>
                </span>
              ))}
            </div>
          </figure>
        )
      })}
    </div>
  )
}
