import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getCopies, getHoldForTitle, getMyLists, getMyRating, getRatingBreakdown,
  getRelatedTitles, getReviews, getTitle,
} from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { sql } from '@/lib/db'
import { Availability, Avatar, BookCover, Stars, TitleGridCard } from '@/components/ui'
import { ShelfMap } from '@/components/shelf-map'
import { ReserveButton } from '@/components/reserve-button'
import { RateBox } from '@/components/rate-box'
import { CiteBox } from '@/components/cite-box'
import { AddToList } from '@/components/add-to-list'
import { formatDate, TYPE_LABEL, timeAgo } from '@/lib/format'
import { IconMapPin } from '@/components/icons'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTitle((await params).id)
  return { title: t?.title ?? 'Title' }
}

const COPY_STATUS: Record<string, { label: string; cls: string }> = {
  available: { label: 'On shelf', cls: 'bg-ok-soft text-ok' },
  on_loan: { label: 'On loan', cls: 'bg-warn-soft text-warn' },
  held: { label: 'Held at desk', cls: 'bg-brand-soft text-brand' },
  lost: { label: 'Lost', cls: 'bg-bad-soft text-bad' },
  repair: { label: 'In repair', cls: 'bg-paper-2 text-ink-3' },
}

const COPY_KIND: Record<string, string> = {
  circulating: 'Circulating',
  reference: 'Reference only',
  reserve: 'Course reserve',
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const title = await getTitle(id)
  if (!title) notFound()

  const [copies, reviews, breakdown, related, myHold, myRating, lists, bookmarked, onLoan, courses] =
    await Promise.all([
      getCopies(id),
      getReviews(id),
      getRatingBreakdown(id),
      getRelatedTitles(id),
      getHoldForTitle(user.id, id),
      getMyRating(user.id, id),
      getMyLists(user.id),
      sql`select 1 from bookmarks where user_id = ${user.id} and title_id = ${id}`,
      sql<{ id: string; due_at: string }[]>`
        select id, due_at from loans where user_id = ${user.id} and title_id = ${id} and returned_at is null`,
      sql<{ code: string; title: string }[]>`
        select c.code, c.title from course_reserves cr join courses c on c.id = cr.course_id where cr.title_id = ${id}`,
    ])

  const queued = await sql<{ n: string }[]>`
    select count(*)::text as n from holds where title_id = ${id} and status = 'queued'`
  const queueLength = Number(queued[0]?.n ?? 0)
  const ratingTotal = breakdown.reduce((s, b) => s + b.count, 0)

  return (
    <div className="mx-auto max-w-6xl">
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/search" className="hover:text-brand">Catalogue</Link>
        <span>/</span>
        <Link href={`/search?type=${title.type}`} className="hover:text-brand">{TYPE_LABEL[title.type]}</Link>
        <span>/</span>
        <span className="truncate text-ink-2">{title.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ============================================ main column */}
        <div className="min-w-0">
          <header className="flex flex-col gap-5 sm:flex-row">
            <BookCover title={title.title} hue={title.cover_hue} type={title.type} size="xl" className="mx-auto sm:mx-0" />
            <div className="min-w-0 flex-1">
              <div className="label-eyebrow">{TYPE_LABEL[title.type]}{title.edition ? ` · ${title.edition}` : ''}</div>
              <h1 className="display mt-1.5 text-[28px] font-semibold leading-tight sm:text-[34px]">{title.title}</h1>
              {title.subtitle && <p className="mt-1 text-lg text-ink-2">{title.subtitle}</p>}
              <p className="mt-2.5 text-[15px] text-ink-2">
                {title.authors.length ? title.authors.join(' · ') : 'Unknown author'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Availability
                  available={title.copies_available}
                  total={title.copies_total}
                  nextDue={title.next_due}
                  type={title.type}
                />
                {ratingTotal > 0 && (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Stars value={Number(title.rating_avg)} className="text-accent" />
                    <span className="font-medium">{Number(title.rating_avg).toFixed(1)}</span>
                    <span className="text-ink-3">({ratingTotal} {ratingTotal === 1 ? 'rating' : 'ratings'})</span>
                  </span>
                )}
                {queueLength > 0 && (
                  <span className="pill bg-paper-2 text-ink-2">{queueLength} waiting</span>
                )}
              </div>

              {courses.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="label-eyebrow">On reserve for</span>
                  {courses.map((c) => (
                    <span key={c.code} className="pill bg-accent-soft text-accent" title={c.title}>{c.code}</span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <ReserveButton
                  titleId={title.id}
                  type={title.type}
                  available={title.copies_available}
                  hold={myHold}
                  onLoan={onLoan[0] ?? null}
                  queueLength={queueLength}
                />
                <AddToList titleId={title.id} lists={lists} bookmarked={bookmarked.length > 0} />
                <CiteBox title={title} />
              </div>
            </div>
          </header>

          {title.summary && (
            <section className="mt-8">
              <h2 className="label-eyebrow mb-2">About this title</h2>
              <p className="max-w-2xl text-[15px] leading-relaxed text-ink-2">{title.summary}</p>
            </section>
          )}

          {/* -------------------------------------- copies */}
          {copies.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="display text-lg font-semibold">Copies</h2>
                <span className="text-xs text-ink-3">
                  {title.copies_available} of {title.copies_total} on the shelf
                </span>
              </div>
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {['Accession', 'Location', 'Shelf', 'Type', 'Status', 'Due back'].map((h) => (
                        <th key={h} className="label-eyebrow px-3.5 py-2.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {copies.map((c) => (
                      <tr key={c.id} className="border-b border-line-2 last:border-0">
                        <td className="px-3.5 py-2.5 font-mono text-[12px] text-ink-2">{c.accession_number}</td>
                        <td className="px-3.5 py-2.5 text-ink-2">{c.location_zone}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <IconMapPin className="size-3.5 text-ink-3" />{c.shelf_bay}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-ink-2">{COPY_KIND[c.copy_type]}</td>
                        <td className="px-3.5 py-2.5">
                          <span className={`pill ${COPY_STATUS[c.status]?.cls}`}>{COPY_STATUS[c.status]?.label}</span>
                        </td>
                        <td className="px-3.5 py-2.5 text-ink-3">{c.due_back ? formatDate(c.due_back) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ShelfMap copies={copies} />
            </section>
          )}

          {/* -------------------------------------- ratings */}
          <section className="mt-8">
            <h2 className="display mb-3 text-lg font-semibold">Reader ratings</h2>
            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <div className="card p-4">
                <div className="display text-4xl font-semibold">{Number(title.rating_avg).toFixed(1)}</div>
                <Stars value={Number(title.rating_avg)} className="mt-1 text-accent" />
                <p className="mt-1 text-xs text-ink-3">{ratingTotal} {ratingTotal === 1 ? 'rating' : 'ratings'} from UIU readers</p>
                <div className="mt-3 space-y-1">
                  {breakdown.map((b) => (
                    <div key={b.stars} className="flex items-center gap-2 text-[11px]">
                      <span className="w-3 tabular-nums text-ink-3">{b.stars}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${ratingTotal ? (b.count / ratingTotal) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="w-6 text-right tabular-nums text-ink-3">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                <RateBox titleId={title.id} existing={myRating} />
                {reviews.map((r) => (
                  <article key={r.id} className="card p-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} hue={r.avatar_hue} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.name}</div>
                        <div className="text-[11px] text-ink-3">{timeAgo(r.created_at)}</div>
                      </div>
                      <Stars value={r.stars} size={13} className="text-accent" />
                    </div>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">{r.review}</p>
                  </article>
                ))}
                {reviews.length === 0 && (
                  <p className="px-1 text-sm text-ink-3">No written reviews yet — be the first.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ============================================ sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <h2 className="label-eyebrow mb-3">Details</h2>
            <dl className="space-y-2 text-[13px]">
              {[
                ['Format', TYPE_LABEL[title.type]],
                ['Publisher', title.publisher],
                ['Year', title.year],
                ['Edition', title.edition],
                ['Pages', title.pages],
                ['Language', title.language],
                ['ISBN', title.isbn],
                ['ISSN', title.issn],
                ['Added', formatDate(title.added_at)],
                ['Borrowed', `${title.borrow_count} times`],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink-3">{k}</dt>
                  <dd className="text-right font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {title.subjects.length > 0 && (
            <div className="card p-4">
              <h2 className="label-eyebrow mb-2.5">Subjects</h2>
              <div className="flex flex-wrap gap-1.5">
                {title.subjects.map((s) => (
                  <Link key={s} href={`/search?subject=${encodeURIComponent(s)}`}
                        className="pill border border-line transition hover:border-brand hover:text-brand">
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="display mb-4 text-lg font-semibold">Readers also borrowed</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((t) => <TitleGridCard key={t.id} t={t} />)}
          </div>
        </section>
      )}
    </div>
  )
}
