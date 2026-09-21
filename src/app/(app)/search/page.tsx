import Link from 'next/link'
import { getMyCourses, searchCatalogue, type SearchParams } from '@/lib/queries'
import { getSession } from '@/lib/session'
import { sql } from '@/lib/db'
import { Empty, SectionHead, TitleRowCard } from '@/components/ui'
import { IconFilter, IconSearch } from '@/components/icons'
import { TYPE_LABEL } from '@/lib/format'
import { SaveSearch } from '@/components/save-search'

export const metadata = { title: 'Catalogue' }

type Q = Record<string, string | string[] | undefined>

function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

function href(current: Q, patch: Record<string, string | undefined | null>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(current)) {
    const s = str(v)
    if (s && k !== 'page') p.set(k, s)
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') p.delete(k)
    else p.set(k, v)
  }
  const s = p.toString()
  return `/search${s ? `?${s}` : ''}`
}

const SORTS = [
  ['relevance', 'Best match'],
  ['newest', 'Newest'],
  ['popular', 'Most borrowed'],
  ['rating', 'Best rated'],
  ['title', 'A–Z'],
] as const

export default async function SearchPage({ searchParams }: { searchParams: Promise<Q> }) {
  const sp = await searchParams
  const user = await getSession()

  const params: SearchParams = {
    q: str(sp.q) ?? '',
    type: str(sp.type),
    subject: str(sp.subject),
    zone: str(sp.zone),
    language: str(sp.language),
    available: str(sp.available) === '1',
    yearFrom: str(sp.yearFrom) ? Number(str(sp.yearFrom)) : undefined,
    yearTo: str(sp.yearTo) ? Number(str(sp.yearTo)) : undefined,
    sort: (str(sp.sort) as SearchParams['sort']) ?? 'relevance',
    page: Number(str(sp.page) ?? 1),
    perPage: 20,
  }

  const [{ results, total, facets }, courses, saved] = await Promise.all([
    searchCatalogue(params),
    user ? getMyCourses(user.id) : Promise.resolve([]),
    user
      ? sql<{ id: string; label: string; query: string; filters: Record<string, string> }[]>`
          select id, label, query, filters from saved_searches where user_id = ${user.id} order by created_at desc limit 6`
      : Promise.resolve([]),
  ])

  const active = [
    params.type && ['type', TYPE_LABEL[params.type] ?? params.type],
    params.subject && ['subject', params.subject],
    params.zone && ['zone', params.zone],
    params.language && ['language', params.language],
    params.available && ['available', 'On the shelf now'],
  ].filter(Boolean) as [string, string][]

  const pages = Math.ceil(total / (params.perPage ?? 20))
  const page = params.page ?? 1

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHead
        eyebrow="Catalogue"
        title={params.q ? `Results for “${params.q}”` : 'Search the catalogue'}
        sub={
          params.q
            ? `${total.toLocaleString()} ${total === 1 ? 'title' : 'titles'} across print, e-books, journals and UIU theses.`
            : 'Print books, e-books, journals and UIU theses in one query — every result shows how many copies are free and where they sit.'
        }
        action={user && <SaveSearch query={params.q ?? ''} filters={Object.fromEntries(active)} saved={saved} />}
      />

      {/* ------------------------------------------------ saved searches */}
      {!params.q && saved.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="label-eyebrow">Saved</span>
          {saved.map((s) => (
            <Link
              key={s.id}
              href={href({}, { q: s.query, ...(s.filters as Record<string, string>) })}
              className="pill border border-line bg-card transition hover:border-brand hover:text-brand"
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {!params.q && courses.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="label-eyebrow">Course reserves</span>
          {courses.filter((c) => c.reserve_count > 0).map((c) => (
            <Link key={c.id} href={`/lists?course=${c.id}`} className="pill border border-line bg-card transition hover:border-brand hover:text-brand">
              {c.code} <span className="text-ink-3">· {c.reserve_count}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[236px_1fr]">
        {/* ---------------------------------------------- filters */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <details open className="card overflow-hidden p-0 lg:[&]:open">
            <summary className="flex cursor-pointer items-center gap-2 border-b border-line px-4 py-3 text-sm font-medium lg:cursor-default">
              <IconFilter className="size-4 text-ink-3" />
              Filters
              {active.length > 0 && (
                <span className="ml-auto pill bg-brand-soft text-brand">{active.length}</span>
              )}
            </summary>

            <div className="space-y-5 px-4 py-4">
              <Link
                href={href(sp, { available: params.available ? null : '1' })}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                  params.available ? 'border-ok bg-ok-soft text-ok' : 'border-line hover:bg-paper-2'
                }`}
              >
                <span className={`grid size-4 place-items-center rounded border ${params.available ? 'border-ok bg-ok text-white' : 'border-line'}`}>
                  {params.available && <span className="text-[9px] leading-none">✓</span>}
                </span>
                On the shelf now
              </Link>

              <Facet label="Format" items={facets.types.map((t) => ({ ...t, display: TYPE_LABEL[t.value] ?? t.value }))}
                     current={params.type} sp={sp} param="type" />
              <Facet label="Subject" items={facets.subjects} current={params.subject} sp={sp} param="subject" limit={10} />
              <Facet label="Location" items={facets.zones} current={params.zone} sp={sp} param="zone" />
              {facets.languages.length > 1 && (
                <Facet label="Language" items={facets.languages} current={params.language} sp={sp} param="language" />
              )}

              <div>
                <div className="label-eyebrow mb-2">Year</div>
                <form action="/search" className="flex items-center gap-1.5">
                  {params.q && <input type="hidden" name="q" value={params.q} />}
                  {params.type && <input type="hidden" name="type" value={params.type} />}
                  {params.subject && <input type="hidden" name="subject" value={params.subject} />}
                  <input name="yearFrom" defaultValue={params.yearFrom} placeholder="from" inputMode="numeric"
                         className="input px-2 py-1.5 text-center text-xs" aria-label="Year from" />
                  <span className="text-ink-3">–</span>
                  <input name="yearTo" defaultValue={params.yearTo} placeholder="to" inputMode="numeric"
                         className="input px-2 py-1.5 text-center text-xs" aria-label="Year to" />
                  <button className="btn btn-ghost px-2 py-1.5 text-xs">Go</button>
                </form>
              </div>

              {active.length > 0 && (
                <Link href={href({ q: sp.q }, {})} className="block text-center text-xs text-ink-3 link-underline">
                  Clear all filters
                </Link>
              )}
            </div>
          </details>
        </aside>

        {/* ---------------------------------------------- results */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {active.map(([k, v]) => (
              <Link key={k} href={href(sp, { [k]: null })} className="pill border border-line bg-card hover:border-bad hover:text-bad">
                {v} <span aria-hidden>×</span>
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              <span className="text-ink-3">Sort</span>
              {SORTS.map(([key, label]) => (
                <Link
                  key={key}
                  href={href(sp, { sort: key === 'relevance' ? null : key })}
                  className={`rounded-md px-2 py-1 transition ${
                    (params.sort ?? 'relevance') === key ? 'bg-brand-soft font-medium text-brand' : 'text-ink-2 hover:bg-paper-2'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <Empty
              icon={<IconSearch className="size-5" />}
              title={params.q ? 'Nothing matched that search' : 'The catalogue is empty'}
              body={params.q ? 'Try fewer words, check the spelling, or drop a filter.' : undefined}
              action={active.length > 0 ? <Link href={href({ q: sp.q }, {})} className="btn btn-ghost">Clear filters</Link> : undefined}
            />
          ) : (
            <div className="space-y-3">
              {results.map((t) => <TitleRowCard key={t.id} t={t} />)}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
              {page > 1 && (
                <Link href={href(sp, { page: String(page - 1) })} className="btn btn-ghost">Previous</Link>
              )}
              <span className="px-3 text-sm text-ink-3">Page {page} of {pages}</span>
              {page < pages && (
                <Link href={href(sp, { page: String(page + 1) })} className="btn btn-ghost">Next</Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

function Facet({
  label, items, current, sp, param, limit = 8,
}: {
  label: string
  items: { value: string; count: number; display?: string }[]
  current?: string
  sp: Q
  param: string
  limit?: number
}) {
  if (items.length === 0) return null
  const shown = items.slice(0, limit)
  return (
    <div>
      <div className="label-eyebrow mb-1.5">{label}</div>
      <ul className="space-y-0.5">
        {shown.map((it) => {
          const on = current === it.value
          return (
            <li key={it.value}>
              <Link
                href={href(sp, { [param]: on ? null : it.value })}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[13px] transition ${
                  on ? 'bg-brand-soft font-medium text-brand' : 'text-ink-2 hover:bg-paper-2'
                }`}
              >
                <span className="truncate">{it.display ?? it.value}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{it.count}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
