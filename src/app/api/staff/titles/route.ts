import { sql } from '@/lib/db'
import { route } from '@/lib/api'
import { RuleError } from '@/lib/circulation'

async function reindex(titleId: string) {
  await sql`select titles_search_refresh(${titleId}::uuid)`
}

async function nextAccession() {
  const [{ next }] = await sql<{ next: string }[]>`
    select coalesce(max(substring(accession_number from 5)::int), 100000) + 1 as next from copies`
  return `UIU-${next}`
}

export const POST = route<{
  title: string; subtitle?: string; type?: string; authors?: string; subjects?: string
  publisher?: string; year?: number; isbn?: string; summary?: string
  copies?: number; zone?: string; bay?: string
}>(async ({ body }) => {
  if (!body.title?.trim()) throw new RuleError('A title is required.')

  const [t] = await sql<{ id: string }[]>`
    insert into titles (type, title, subtitle, publisher, year, isbn, summary, cover_hue)
    values (${body.type || 'print'}::title_type, ${body.title.trim()}, ${body.subtitle?.trim() || null},
            ${body.publisher?.trim() || null}, ${body.year || null}, ${body.isbn?.trim() || null},
            ${body.summary?.trim() || null}, ${Math.floor(Math.random() * 360)})
    returning id`

  const authors = (body.authors ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  for (const [i, name] of authors.entries()) {
    const [a] = await sql<{ id: string }[]>`
      insert into authors (name) values (${name})
      on conflict (name) do update set name = excluded.name returning id`
    await sql`insert into title_authors (title_id, author_id, ord) values (${t!.id}, ${a!.id}, ${i})
              on conflict do nothing`
  }

  const subjects = (body.subjects ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  for (const name of subjects) {
    const [s] = await sql<{ id: string }[]>`
      insert into subjects (name) values (${name})
      on conflict (name) do update set name = excluded.name returning id`
    await sql`insert into title_subjects (title_id, subject_id) values (${t!.id}, ${s!.id}) on conflict do nothing`
  }

  const n = Math.max(0, Math.min(20, Number(body.copies ?? 0)))
  for (let i = 0; i < n; i++) {
    await sql`insert into copies (title_id, accession_number, location_zone, shelf_bay)
              values (${t!.id}, ${await nextAccession()},
                      ${body.zone || 'First Floor — Stacks A'}, ${body.bay || 'A-1'})`
  }

  await reindex(t!.id)
  return { id: t!.id, copies: n }
}, { staff: true })

export const PATCH = route<{ id: string; title?: string; summary?: string; publisher?: string; year?: number }>(
  async ({ body }) => {
    await sql`update titles set
        title     = coalesce(${body.title ?? null}, title),
        summary   = coalesce(${body.summary ?? null}, summary),
        publisher = coalesce(${body.publisher ?? null}, publisher),
        year      = coalesce(${body.year ?? null}, year)
      where id = ${body.id}`
    await reindex(body.id)
    return { ok: true }
  }, { staff: true })

export const DELETE = route<{ id: string }>(async ({ body }) => {
  const [onLoan] = await sql`
    select 1 from loans l join copies c on c.id = l.copy_id
    where c.title_id = ${body.id} and l.returned_at is null`
  if (onLoan) throw new RuleError('Copies of this title are still on loan.')
  await sql`delete from titles where id = ${body.id}`
  return { ok: true }
}, { staff: true })
