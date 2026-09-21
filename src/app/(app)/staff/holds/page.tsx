import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getHoldQueue } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { Empty, SectionHead } from '@/components/ui'
import { HoldActions } from '@/components/hold-actions'
import { formatDate, timeAgo } from '@/lib/format'
import { IconBook } from '@/components/icons'

export const metadata = { title: 'Hold queue' }

export default async function HoldsPage() {
  const user = await requireUser()
  if (user.role !== 'staff') redirect('/search')

  const holds = await getHoldQueue()
  const ready = holds.filter((h) => h.status === 'ready')
  const queued = holds.filter((h) => h.status === 'queued')

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead
        eyebrow="Back office"
        title="Hold queue"
        sub="Reservations waiting at the desk and readers queued for a copy. Expiring a hold passes the copy to the next reader automatically."
      />

      {ready.length > 0 && (
        <section className="mb-8">
          <h2 className="display mb-3 text-lg font-semibold">Waiting at the desk</h2>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Title', 'Reader', 'Ready since', 'Expires', ''].map((h, i) => (
                    <th key={i} className="label-eyebrow px-3.5 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ready.map((h) => {
                  const expired = h.expires_at && new Date(h.expires_at) < new Date()
                  return (
                    <tr key={h.id} className="border-b border-line-2 last:border-0">
                      <td className="max-w-0 px-3.5 py-2.5">
                        <Link href={`/titles/${h.title_id}`} className="block truncate font-medium hover:text-brand">
                          {h.title}
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="block truncate text-ink-2">{h.user_name}</span>
                        <span className="block text-[11px] text-ink-3">{h.uiu_id}</span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-3">{h.ready_at ? timeAgo(h.ready_at) : '—'}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <span className={expired ? 'text-bad' : 'text-ink-3'}>
                          {formatDate(h.expires_at, { year: undefined })}
                          {expired && <span className="block text-[11px]">past 48 hours</span>}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <HoldActions holdId={h.id} status={h.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="display mb-3 text-lg font-semibold">In the queue</h2>
        {queued.length === 0 ? (
          <Empty icon={<IconBook className="size-5" />} title="Nobody is waiting" />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['#', 'Title', 'Reader', 'Reserved', 'Copies free', ''].map((h, i) => (
                    <th key={i} className="label-eyebrow px-3.5 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queued.map((h) => (
                  <tr key={h.id} className="border-b border-line-2 last:border-0">
                    <td className="px-3.5 py-2.5 tabular-nums text-ink-3">{h.position}</td>
                    <td className="max-w-0 px-3.5 py-2.5">
                      <Link href={`/titles/${h.title_id}`} className="block truncate font-medium hover:text-brand">
                        {h.title}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="block truncate text-ink-2">{h.user_name}</span>
                      <span className="block text-[11px] text-ink-3">{h.uiu_id}</span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-3">{timeAgo(h.placed_at)}</td>
                    <td className="px-3.5 py-2.5">
                      {h.copies_available > 0
                        ? <span className="pill bg-ok-soft text-ok">{h.copies_available} free</span>
                        : <span className="pill bg-paper-2 text-ink-3">none</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <HoldActions holdId={h.id} status={h.status} canReady={h.copies_available > 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
