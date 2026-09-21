import Link from 'next/link'
import { getLoanRules, getMyHistory, getMyHolds, getMyLoans } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { BookCover, DueBadge, Empty, SectionHead, Stat } from '@/components/ui'
import { RenewButton, CancelHoldButton } from '@/components/loan-actions'
import { authorLine, daysUntil, formatDate, TYPE_SHORT } from '@/lib/format'
import { IconBook, IconClock } from '@/components/icons'

export const metadata = { title: 'Loans & holds' }

export default async function LoansPage() {
  const user = await requireUser()
  const [loans, holds, history, rules] = await Promise.all([
    getMyLoans(user.id),
    getMyHolds(user.id),
    getMyHistory(user.id, 20),
    getLoanRules(user.role),
  ])

  const overdue = loans.filter((l) => daysUntil(l.due_at) < 0)
  const dueSoon = loans.filter((l) => { const d = daysUntil(l.due_at); return d >= 0 && d <= 3 })
  const ready = holds.filter((h) => h.status === 'ready')

  // 14-day timeline: everything due inside the window, plotted by day
  const WINDOW = 14
  const timeline = Array.from({ length: WINDOW + 1 }, (_, i) => {
    const day = i
    return {
      day,
      items: loans.filter((l) => daysUntil(l.due_at) === day),
      date: new Date(Date.now() + day * 86400000),
    }
  })

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead
        eyebrow="Circulation"
        title="Loans, holds & renewals"
        sub={`Your limit is ${rules.max_items} items at a time for ${rules.loan_days} days, renewable ${rules.max_renewals} times unless another reader is waiting.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="On loan" value={loans.length} hint={`of ${rules.max_items} allowed`} />
        <Stat label="Due in 3 days" value={dueSoon.length} tone={dueSoon.length ? 'warn' : 'default'} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? 'bad' : 'default'}
              hint={overdue.length ? '৳10 per item per day' : 'nothing late'} />
        <Stat label="Reservations" value={holds.length} tone={ready.length ? 'good' : 'default'}
              hint={ready.length ? `${ready.length} ready for pickup` : undefined} />
      </div>

      {/* ---------------------------------------------- timeline */}
      {loans.length > 0 && (
        <section className="card mb-6 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Next 14 days</h2>
            <span className="text-[11px] text-ink-3">Due dates at a glance</span>
          </div>
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {timeline.map((slot) => {
              const has = slot.items.length > 0
              return (
                <div key={slot.day} className="flex min-w-[26px] flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-[3px] transition ${
                      has ? 'bg-warn' : 'bg-paper-2'
                    }`}
                    style={{ height: has ? 8 + slot.items.length * 12 : 8 }}
                    title={has ? slot.items.map((i) => i.title).join(', ') : 'nothing due'}
                  />
                  <span className="text-[9px] tabular-nums text-ink-3">
                    {slot.day === 0 ? 'today' : slot.date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
          {overdue.length > 0 && (
            <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">
              {overdue.length} item{overdue.length > 1 ? 's are' : ' is'} already overdue and accruing ৳10 per day.{' '}
              <Link href="/fines" className="link-underline font-medium">See charges</Link>
            </p>
          )}
        </section>
      )}

      {/* ---------------------------------------------- holds */}
      {holds.length > 0 && (
        <section className="mb-8">
          <h2 className="display mb-3 text-lg font-semibold">Reservations</h2>
          <div className="space-y-3">
            {holds.map((h) => (
              <article key={h.id} className="card flex items-center gap-4 p-4">
                <Link href={`/titles/${h.title_id}`}>
                  <BookCover title={h.title} hue={h.cover_hue} type={h.type} />
                </Link>
                <div className="min-w-0 flex-1">
                  <span className="label-eyebrow">{TYPE_SHORT[h.type]}</span>
                  <h3 className="truncate font-medium">
                    <Link href={`/titles/${h.title_id}`} className="hover:text-brand">{h.title}</Link>
                  </h3>
                  {h.status === 'ready' ? (
                    <p className="mt-1 text-sm text-ok">
                      Ready at the circulation desk — collect by {formatDate(h.expires_at)}.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-ink-2">
                      Position <span className="font-medium">{h.queue_position}</span> in the queue ·
                      {' '}reserved {formatDate(h.placed_at)}
                    </p>
                  )}
                </div>
                <CancelHoldButton holdId={h.id} />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------- loans */}
      <section className="mb-8">
        <h2 className="display mb-3 text-lg font-semibold">On loan</h2>
        {loans.length === 0 ? (
          <Empty
            icon={<IconBook className="size-5" />}
            title="Nothing on loan"
            body="Search the catalogue and reserve a title — a copy is held for you at the desk for 48 hours."
            action={<Link href="/search" className="btn btn-primary">Browse the catalogue</Link>}
          />
        ) : (
          <div className="space-y-3">
            {loans.map((l) => (
              <article key={l.id} className="card flex flex-wrap items-center gap-4 p-4">
                <Link href={`/titles/${l.title_id}`}>
                  <BookCover title={l.title} hue={l.cover_hue} type={l.type} />
                </Link>
                <div className="min-w-[180px] flex-1">
                  <span className="label-eyebrow">{TYPE_SHORT[l.type]} · {l.accession_number}</span>
                  <h3 className="truncate font-medium">
                    <Link href={`/titles/${l.title_id}`} className="hover:text-brand">{l.title}</Link>
                  </h3>
                  <p className="truncate text-sm text-ink-2">{authorLine(l.authors)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DueBadge due={l.due_at} />
                    <span className="text-xs text-ink-3">Due {formatDate(l.due_at)}</span>
                    {l.renewals_count > 0 && (
                      <span className="text-xs text-ink-3">· renewed {l.renewals_count}×</span>
                    )}
                  </div>
                </div>
                <RenewButton
                  loanId={l.id}
                  renewals={l.renewals_count}
                  maxRenewals={rules.max_renewals}
                  blocked={l.queued_behind > 0}
                  queued={l.queued_behind}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------- history */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="display text-lg font-semibold">Borrowing history</h2>
          <Link href="/profile" className="text-xs text-ink-3 link-underline">Clear history in profile</Link>
        </div>
        {history.length === 0 ? (
          <Empty icon={<IconClock className="size-5" />} title="Nothing returned yet" />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Title', 'Borrowed', 'Returned', 'Renewals'].map((h) => (
                    <th key={h} className="label-eyebrow px-4 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-line-2 last:border-0">
                    <td className="max-w-0 px-4 py-2.5">
                      <Link href={`/titles/${h.title_id}`} className="block truncate font-medium hover:text-brand">
                        {h.title}
                      </Link>
                      <span className="block truncate text-xs text-ink-3">{authorLine(h.authors, 1)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{formatDate(h.issued_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{formatDate(h.returned_at)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-3">{h.renewals_count}</td>
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
