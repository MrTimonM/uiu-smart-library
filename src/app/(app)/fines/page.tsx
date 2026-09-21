import { getMyFines, getMyLoans } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { Empty, SectionHead, Stat } from '@/components/ui'
import { PayBox, MethodMark } from '@/components/pay-box'
import { daysUntil, formatDate, money } from '@/lib/format'
import { IconCheck, IconWallet } from '@/components/icons'

export const metadata = { title: 'Fines & payments' }

const LEDGER_TONE: Record<string, string> = {
  charge: 'text-bad',
  payment: 'text-ok',
  waiver: 'text-ink-3',
}

export default async function FinesPage() {
  const user = await requireUser()
  const [{ fines, ledger, payments, outstanding }, loans] = await Promise.all([
    getMyFines(user.id),
    getMyLoans(user.id),
  ])

  const accruing = loans.filter((l) => daysUntil(l.due_at) < 0)
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const cleared = outstanding === 0

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHead
        eyebrow="Account"
        title="Fines, payments & clearance"
        sub="৳10 per item per day, shown the moment it is posted. Every charge, payment and waiver is on the ledger below."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? 'bad' : 'good'} />
        <Stat label="Accruing now" value={accruing.length} hint={accruing.length ? 'overdue items' : 'nothing late'} tone={accruing.length ? 'warn' : 'default'} />
        <Stat label="Paid to date" value={money(totalPaid)} />
        <Stat
          label="Semester clearance"
          value={cleared ? 'Clear' : 'Blocked'}
          tone={cleared ? 'good' : 'bad'}
          hint={cleared ? 'nothing blocking sign-off' : 'settle to clear'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* -------------------------------------- accruing */}
          {accruing.length > 0 && (
            <section className="card border-warn/40 p-4">
              <h2 className="text-sm font-medium text-warn">Charges building up right now</h2>
              <ul className="mt-3 space-y-2">
                {accruing.map((l) => {
                  const late = Math.abs(daysUntil(l.due_at))
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      <span className="shrink-0 text-xs text-ink-3">{late} day{late > 1 ? 's' : ''} late</span>
                      <span className="shrink-0 font-medium tabular-nums text-warn">{money(late * 10)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-3">
                These are posted to your account when the item comes back to the desk.
              </p>
            </section>
          )}

          {/* -------------------------------------- charges */}
          <section>
            <h2 className="display mb-3 text-lg font-semibold">Charges</h2>
            {fines.length === 0 ? (
              <Empty icon={<IconCheck className="size-5" />} title="No charges" body="Nothing has ever been posted to your account." />
            ) : (
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {['Item', 'Posted', 'Late', 'Amount', 'Status'].map((h) => (
                        <th key={h} className="label-eyebrow px-4 py-2.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map((f) => (
                      <tr key={f.id} className="border-b border-line-2 last:border-0">
                        <td className="max-w-0 truncate px-4 py-2.5">{f.title ?? f.reason}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{formatDate(f.posted_at)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-ink-3">{f.days_late}d</td>
                        <td className="px-4 py-2.5 font-medium tabular-nums">{money(f.amount)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`pill ${
                            f.status === 'paid' ? 'bg-ok-soft text-ok'
                            : f.status === 'waived' ? 'bg-paper-2 text-ink-3'
                            : 'bg-bad-soft text-bad'}`}>
                            {f.status === 'paid' ? 'Paid' : f.status === 'waived' ? 'Waived' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* -------------------------------------- ledger */}
          {ledger.length > 0 && (
            <section>
              <h2 className="display mb-3 text-lg font-semibold">Ledger</h2>
              <ol className="card divide-y divide-line-2 p-0">
                {ledger.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{e.description}</span>
                      <span className="block text-[11px] text-ink-3">{formatDate(e.created_at)}</span>
                    </span>
                    <span className={`shrink-0 font-medium tabular-nums ${LEDGER_TONE[e.type]}`}>
                      {e.type === 'charge' ? '+' : '−'}{money(e.amount)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* ---------------------------------------- pay */}
        <aside className="space-y-5">
          <PayBox outstanding={outstanding} />

          <section className="card p-4">
            <h2 className="text-sm font-medium">Payment history</h2>
            {payments.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-3">
                <IconWallet className="size-4" /> No payments yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 text-[13px]">
                    <span className="min-w-0">
                      <span className="mb-1 inline-grid h-6 place-items-center rounded bg-white px-1.5">
                        <MethodMark method={p.method} className="h-4" />
                      </span>
                      <span className="block font-mono text-[11px] text-ink-3">{p.reference}</span>
                      <span className="block text-[11px] text-ink-3">{formatDate(p.paid_at)}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-ok">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-medium">How charges work</h2>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-2">
              <li>৳10 per item per day, from the day after the due date.</li>
              <li>Posted when the item is returned to the desk.</li>
              <li>Reservations are blocked once you owe ৳500 or more.</li>
              <li>Semester sign-off needs a clear balance.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
