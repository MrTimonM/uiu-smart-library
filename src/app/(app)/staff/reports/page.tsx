import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getReports } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { SectionHead, Stat } from '@/components/ui'
import { money, TYPE_LABEL } from '@/lib/format'

export const metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const user = await requireUser()
  if (user.role !== 'staff') redirect('/search')

  const { monthly, topTitles, byType, fines, totals } = await getReports()
  const peak = Math.max(1, ...monthly.map((m) => m.loans))
  const typeTotal = byType.reduce((s, t) => s + t.count, 0)
  const maxLoans = Math.max(1, ...topTitles.map((t) => t.loans))

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead
        eyebrow="Back office"
        title="Reports"
        sub="Circulation volume, the titles under most pressure, and what the library is owed."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Titles held" value={totals.titles.toLocaleString()} />
        <Stat label="Copies" value={totals.copies.toLocaleString()} />
        <Stat label="Members" value={totals.users.toLocaleString()} />
        <Stat label="Reading lists" value={totals.lists.toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ---------------------------------------- loans per month */}
        <section className="card p-5">
          <h2 className="text-sm font-medium">Loans per month</h2>
          <p className="mt-0.5 text-xs text-ink-3">Issues recorded over the last twelve months.</p>
          <div className="mt-5 flex h-44 items-end gap-1.5">
            {monthly.map((m) => (
              <div key={m.month} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] tabular-nums text-ink-3 opacity-0 transition group-hover:opacity-100">
                  {m.loans}
                </span>
                <div
                  className="w-full rounded-t-[3px] bg-brand transition group-hover:bg-brand-2"
                  style={{ height: `${(m.loans / peak) * 100}%` }}
                  title={`${m.month}: ${m.loans} loans`}
                />
                <span className="text-[9px] text-ink-3">{m.month.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------- fines */}
        <section className="card p-5">
          <h2 className="text-sm font-medium">Fine collection</h2>
          <p className="mt-0.5 text-xs text-ink-3">At ৳10 per item per day.</p>
          <dl className="mt-4 space-y-3">
            {[
              ['Charged', fines.charged, 'text-ink'],
              ['Collected', fines.collected, 'text-ok'],
              ['Outstanding', fines.outstanding, 'text-bad'],
            ].map(([label, value, cls]) => (
              <div key={label as string}>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[13px] text-ink-2">{label}</dt>
                  <dd className={`display text-lg font-semibold tabular-nums ${cls}`}>{money(value as string)}</dd>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className={`h-full rounded-full ${label === 'Collected' ? 'bg-ok' : label === 'Outstanding' ? 'bg-bad' : 'bg-ink-3'}`}
                    style={{ width: `${(Number(value) / Math.max(1, Number(fines.charged))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------------------------------------- most borrowed */}
        <section className="card p-5">
          <h2 className="text-sm font-medium">Most borrowed</h2>
          <ol className="mt-4 space-y-2.5">
            {topTitles.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-right text-xs tabular-nums text-ink-3">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <Link href={`/titles/${t.id}`} className="block truncate text-[13px] font-medium hover:text-brand">
                    {t.title}
                  </Link>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(t.loans / maxLoans) * 100}%` }} />
                  </span>
                </span>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-ink-3">{t.loans}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------- collection mix */}
        <section className="card p-5">
          <h2 className="text-sm font-medium">Collection mix</h2>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
            {byType.map((t, i) => (
              <span
                key={t.type}
                style={{
                  width: `${(t.count / typeTotal) * 100}%`,
                  background: `oklch(${58 - i * 6}% ${0.13 - i * 0.02} ${264 + i * 30})`,
                }}
                title={`${TYPE_LABEL[t.type]}: ${t.count}`}
              />
            ))}
          </div>
          <dl className="mt-4 space-y-2">
            {byType.map((t, i) => (
              <div key={t.type} className="flex items-center gap-2 text-[13px]">
                <span className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ background: `oklch(${58 - i * 6}% ${0.13 - i * 0.02} ${264 + i * 30})` }} />
                <dt className="min-w-0 flex-1 truncate text-ink-2">{TYPE_LABEL[t.type] ?? t.type}</dt>
                <dd className="tabular-nums font-medium">{t.count}</dd>
                <dd className="w-10 text-right tabular-nums text-ink-3">
                  {Math.round((t.count / typeTotal) * 100)}%
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
