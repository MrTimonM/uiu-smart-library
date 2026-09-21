import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDeskStats, getOverdueList } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { SectionHead, Stat } from '@/components/ui'
import { DeskConsole } from '@/components/desk-console'
import { formatDate, money } from '@/lib/format'

export const metadata = { title: 'Circulation desk' }

export default async function StaffDeskPage() {
  const user = await requireUser()
  if (user.role !== 'staff') redirect('/search')

  const [stats, overdue] = await Promise.all([getDeskStats(), getOverdueList(12)])

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHead
        eyebrow="Back office"
        title="Circulation desk"
        sub="Issue and accept returns. Overdue charges are posted automatically the moment an item comes back late."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="On loan" value={stats.open_loans} />
        <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? 'bad' : 'default'} />
        <Stat label="Holds ready" value={stats.holds_ready} tone={stats.holds_ready ? 'good' : 'default'} />
        <Stat label="In queue" value={stats.holds_queued} />
        <Stat label="Issued today" value={stats.today_issued} />
        <Stat label="Returned today" value={stats.today_returned} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <DeskConsole />

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="display text-lg font-semibold">Overdue</h2>
            <Link href="/staff/reports" className="text-xs text-ink-3 link-underline">Full report</Link>
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Item', 'Member', 'Due', 'Charge'].map((h) => (
                    <th key={h} className="label-eyebrow px-3.5 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdue.length === 0 && (
                  <tr><td colSpan={4} className="px-3.5 py-8 text-center text-sm text-ink-3">Nothing overdue.</td></tr>
                )}
                {overdue.map((o) => (
                  <tr key={o.id} className="border-b border-line-2 last:border-0">
                    <td className="max-w-0 px-3.5 py-2.5">
                      <span className="block truncate font-medium">{o.title}</span>
                      <span className="block font-mono text-[11px] text-ink-3">{o.accession_number}</span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="block truncate text-ink-2">{o.user_name}</span>
                      <span className="block text-[11px] text-ink-3">{o.uiu_id}</span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-3">
                      {formatDate(o.due_at, { year: undefined })}
                      <span className="block text-[11px] text-bad">{o.days_late}d late</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-medium tabular-nums text-bad">{money(o.days_late * 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
