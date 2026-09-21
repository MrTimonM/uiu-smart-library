import 'server-only'
import { sql } from './db'
import type {
  CopyRow, HoldRow, LoanRow, NotificationRow, SearchResult, TitleRow,
} from './types'

/* ============================================================ search */

export interface SearchParams {
  q?: string
  type?: string
  available?: boolean
  subject?: string
  zone?: string
  language?: string
  yearFrom?: number
  yearTo?: number
  sort?: 'relevance' | 'newest' | 'popular' | 'rating' | 'title'
  page?: number
  perPage?: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  facets: {
    types: { value: string; count: number }[]
    subjects: { value: string; count: number }[]
    zones: { value: string; count: number }[]
    languages: { value: string; count: number }[]
  }
}

export async function searchCatalogue(p: SearchParams): Promise<SearchResponse> {
  const q = (p.q ?? '').trim()
  const perPage = p.perPage ?? 20
  const page = Math.max(1, p.page ?? 1)
  const offset = (page - 1) * perPage

  // websearch_to_tsquery understands quoted phrases and OR, and never throws
  // on user input the way to_tsquery does.
  const tsq = q ? sql`websearch_to_tsquery('english', ${q})` : null

  const where = sql`
    where true
    ${q ? sql`and (t.search_tsv @@ ${tsq!} or t.title ilike ${'%' + q + '%'})` : sql``}
    ${p.type ? sql`and t.type = ${p.type}::title_type` : sql``}
    ${p.language ? sql`and t.language = ${p.language}` : sql``}
    ${p.yearFrom ? sql`and t.year >= ${p.yearFrom}` : sql``}
    ${p.yearTo ? sql`and t.year <= ${p.yearTo}` : sql``}
    ${p.subject ? sql`and exists (select 1 from title_subjects ts join subjects s on s.id=ts.subject_id
                                   where ts.title_id = t.id and s.name = ${p.subject})` : sql``}
    ${p.zone ? sql`and exists (select 1 from copies c where c.title_id = t.id and c.location_zone = ${p.zone})` : sql``}
    ${p.available ? sql`and (t.type = 'ebook' or exists (select 1 from copies c where c.title_id = t.id and c.status = 'available'))` : sql``}
  `

  const order =
    p.sort === 'newest' ? sql`t.added_at desc`
    : p.sort === 'popular' ? sql`t.borrow_count desc, t.rating_count desc`
    : p.sort === 'rating' ? sql`t.rating_avg desc, t.rating_count desc`
    : p.sort === 'title' ? sql`t.title asc`
    : q ? sql`rank desc, t.borrow_count desc`
    : sql`t.borrow_count desc, t.title asc`

  const results = await sql<SearchResult[]>`
    select
      t.*,
      ${q ? sql`ts_rank(t.search_tsv, ${tsq!})` : sql`0::real`} as rank,
      coalesce(av.copies_total, 0)     as copies_total,
      coalesce(av.copies_available, 0) as copies_available,
      av.next_due,
      coalesce(au.names, '{}')  as authors,
      coalesce(su.names, '{}')  as subjects
    from titles t
    left join title_availability av on av.title_id = t.id
    left join lateral (
      select array_agg(a.name order by ta.ord) as names
      from title_authors ta join authors a on a.id = ta.author_id where ta.title_id = t.id
    ) au on true
    left join lateral (
      select array_agg(s.name order by s.name) as names
      from title_subjects ts join subjects s on s.id = ts.subject_id where ts.title_id = t.id
    ) su on true
    ${where}
    order by ${order}
    limit ${perPage} offset ${offset}`

  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count from titles t ${where}`

  // Facets are computed against the same filter set minus the facet's own
  // dimension would be ideal; for a catalogue this size the simpler
  // "counts within the current result set" reads more predictably.
  const [types, subjects, zones, languages] = await Promise.all([
    sql<{ value: string; count: number }[]>`
      select t.type::text as value, count(*)::int as count from titles t ${where} group by 1 order by 2 desc`,
    sql<{ value: string; count: number }[]>`
      select s.name as value, count(*)::int as count
      from titles t join title_subjects ts on ts.title_id = t.id join subjects s on s.id = ts.subject_id
      ${where} group by 1 order by 2 desc, 1 limit 18`,
    sql<{ value: string; count: number }[]>`
      select c.location_zone as value, count(distinct t.id)::int as count
      from titles t join copies c on c.title_id = t.id ${where} group by 1 order by 2 desc`,
    sql<{ value: string; count: number }[]>`
      select t.language as value, count(*)::int as count from titles t ${where} group by 1 order by 2 desc`,
  ])

  return { results, total: Number(count), facets: { types, subjects, zones, languages } }
}

export async function searchSuggestions(q: string, limit = 6) {
  if (!q.trim()) return []
  return sql<{ id: string; title: string; type: string; cover_hue: number; authors: string[] }[]>`
    select t.id, t.title, t.type::text, t.cover_hue,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id), '{}') as authors
    from titles t
    where t.title ilike ${'%' + q + '%'}
       or t.search_tsv @@ websearch_to_tsquery('english', ${q})
    order by t.borrow_count desc limit ${limit}`
}

/* ============================================================ title detail */

export async function getTitle(id: string) {
  const rows = await sql<(SearchResult & { digital: boolean })[]>`
    select t.*,
      coalesce(av.copies_total,0) as copies_total,
      coalesce(av.copies_available,0) as copies_available,
      av.next_due,
      coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                join authors a on a.id=ta.author_id where ta.title_id=t.id), '{}') as authors,
      coalesce((select array_agg(s.name order by s.name) from title_subjects ts
                join subjects s on s.id=ts.subject_id where ts.title_id=t.id), '{}') as subjects,
      exists(select 1 from digital_assets d where d.title_id = t.id) as digital
    from titles t
    left join title_availability av on av.title_id = t.id
    where t.id = ${id}`
  return rows[0] ?? null
}

export async function getCopies(titleId: string) {
  return sql<CopyRow[]>`
    select id, accession_number, location_zone, shelf_bay, copy_type::text, status::text, due_back
    from copies where title_id = ${titleId}
    order by location_zone, shelf_bay, accession_number`
}

export async function getReviews(titleId: string) {
  return sql<{ id: string; stars: number; review: string | null; created_at: string; name: string; avatar_hue: number }[]>`
    select r.id, r.stars, r.review, r.created_at, u.name, u.avatar_hue
    from ratings r join users u on u.id = r.user_id
    where r.title_id = ${titleId} and r.review is not null
    order by r.created_at desc limit 8`
}

export async function getRatingBreakdown(titleId: string) {
  const rows = await sql<{ stars: number; count: number }[]>`
    select stars, count(*)::int as count from ratings where title_id = ${titleId} group by stars`
  const map = new Map(rows.map((r) => [r.stars, r.count]))
  return [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: map.get(s) ?? 0 }))
}

export async function getMyRating(userId: string, titleId: string) {
  const rows = await sql<{ stars: number; review: string | null }[]>`
    select stars, review from ratings where user_id = ${userId} and title_id = ${titleId}`
  return rows[0] ?? null
}

export async function getRelatedTitles(titleId: string, limit = 6) {
  return sql<SearchResult[]>`
    select t.*, coalesce(av.copies_available,0) as copies_available, coalesce(av.copies_total,0) as copies_total,
           av.next_due,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors,
           '{}'::text[] as subjects
    from titles t
    left join title_availability av on av.title_id = t.id
    where t.id <> ${titleId}
      and exists (
        select 1 from title_subjects a join title_subjects b on a.subject_id = b.subject_id
        where a.title_id = ${titleId} and b.title_id = t.id)
    order by t.borrow_count desc limit ${limit}`
}

/* ============================================================ circulation */

export async function getMyLoans(userId: string) {
  return sql<LoanRow[]>`
    select l.id, l.title_id, t.title, t.type::text, t.cover_hue, c.accession_number,
           l.issued_at, l.due_at, l.returned_at, l.renewals_count,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors,
           (select count(*)::int from holds h where h.title_id = t.id and h.status = 'queued') as queued_behind
    from loans l
    join copies c on c.id = l.copy_id
    join titles t on t.id = l.title_id
    where l.user_id = ${userId} and l.returned_at is null
    order by l.due_at asc`
}

export async function getMyHistory(userId: string, limit = 40) {
  return sql<LoanRow[]>`
    select l.id, l.title_id, t.title, t.type::text, t.cover_hue, c.accession_number,
           l.issued_at, l.due_at, l.returned_at, l.renewals_count,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors,
           0 as queued_behind
    from loans l join copies c on c.id = l.copy_id join titles t on t.id = l.title_id
    where l.user_id = ${userId} and l.returned_at is not null
    order by l.returned_at desc limit ${limit}`
}

export async function getMyHolds(userId: string) {
  return sql<HoldRow[]>`
    select h.id, h.title_id, t.title, t.type::text, t.cover_hue, h.status::text,
           h.placed_at, h.ready_at, h.expires_at,
           (select count(*)::int + 1 from holds h2
            where h2.title_id = h.title_id and h2.status = 'queued' and h2.placed_at < h.placed_at) as queue_position,
           coalesce((select count(*)::int from copies c where c.title_id = h.title_id), 0) as copies_total
    from holds h join titles t on t.id = h.title_id
    where h.user_id = ${userId} and h.status in ('queued','ready')
    order by h.placed_at asc`
}

export async function getHoldForTitle(userId: string, titleId: string) {
  const rows = await sql<{ id: string; status: string; queue_position: number }[]>`
    select h.id, h.status::text,
           (select count(*)::int + 1 from holds h2
            where h2.title_id = h.title_id and h2.status='queued' and h2.placed_at < h.placed_at) as queue_position
    from holds h where h.user_id = ${userId} and h.title_id = ${titleId} and h.status in ('queued','ready')`
  return rows[0] ?? null
}

export async function getLoanRules(role: string) {
  const rows = await sql<{ max_items: number; loan_days: number; max_renewals: number }[]>`
    select max_items, loan_days, max_renewals from loan_rules where role = ${role}::user_role`
  return rows[0] ?? { max_items: 5, loan_days: 14, max_renewals: 2 }
}

/* ============================================================ fines */

export async function getMyFines(userId: string) {
  const fines = await sql<{ id: string; amount: string; days_late: number; reason: string; posted_at: string; status: string; title: string | null }[]>`
    select f.id, f.amount, f.days_late, f.reason, f.posted_at, f.status::text, t.title
    from fines f left join titles t on t.id = f.title_id
    where f.user_id = ${userId} order by f.posted_at desc`
  const ledger = await sql<{ id: string; type: string; amount: string; description: string; created_at: string }[]>`
    select id, type::text, amount, description, created_at
    from ledger_entries where user_id = ${userId} order by created_at desc limit 30`
  const payments = await sql<{ id: string; amount: string; method: string; reference: string; paid_at: string }[]>`
    select id, amount, method::text, reference, paid_at from payments where user_id = ${userId} order by paid_at desc`
  const outstanding = fines.filter((f) => f.status === 'unpaid').reduce((s, f) => s + Number(f.amount), 0)
  return { fines, ledger, payments, outstanding }
}

/* ============================================================ lists */

export async function getMyLists(userId: string) {
  return sql<{ id: string; name: string; description: string | null; visibility: string; share_slug: string; course_code: string | null; item_count: number; read_count: number; hues: number[] }[]>`
    select rl.id, rl.name, rl.description, rl.visibility::text, rl.share_slug, c.code as course_code,
           count(i.id)::int as item_count,
           count(i.read_at)::int as read_count,
           coalesce(array_agg(t.cover_hue) filter (where t.cover_hue is not null), '{}') as hues
    from reading_lists rl
    left join courses c on c.id = rl.course_id
    left join reading_list_items i on i.list_id = rl.id
    left join titles t on t.id = i.title_id
    where rl.owner_id = ${userId}
    group by rl.id, c.code
    order by rl.created_at desc`
}

export async function getList(listId: string) {
  const rows = await sql<{ id: string; owner_id: string; name: string; description: string | null; visibility: string; share_slug: string; owner_name: string; course_code: string | null }[]>`
    select rl.*, u.name as owner_name, c.code as course_code
    from reading_lists rl join users u on u.id = rl.owner_id
    left join courses c on c.id = rl.course_id
    where rl.id = ${listId}`
  if (!rows[0]) return null
  const items = await sql<(SearchResult & { item_id: string; read_at: string | null; note: string | null })[]>`
    select i.id as item_id, i.read_at, i.note, t.*,
           coalesce(av.copies_available,0) as copies_available, coalesce(av.copies_total,0) as copies_total, av.next_due,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors,
           '{}'::text[] as subjects
    from reading_list_items i join titles t on t.id = i.title_id
    left join title_availability av on av.title_id = t.id
    where i.list_id = ${listId} order by i.added_at`
  return { ...rows[0], items }
}

export async function getBookmarks(userId: string) {
  return sql<SearchResult[]>`
    select t.*, coalesce(av.copies_available,0) as copies_available, coalesce(av.copies_total,0) as copies_total, av.next_due,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors,
           '{}'::text[] as subjects
    from bookmarks b join titles t on t.id = b.title_id
    left join title_availability av on av.title_id = t.id
    where b.user_id = ${userId} order by b.added_at desc`
}

export async function getMyCourses(userId: string) {
  return sql<{ id: string; code: string; title: string; reserve_count: number }[]>`
    select c.id, c.code, c.title, (select count(*)::int from course_reserves cr where cr.course_id = c.id) as reserve_count
    from enrollments e join courses c on c.id = e.course_id
    where e.user_id = ${userId} order by c.code`
}

/* ============================================================ rooms */

export async function getRooms() {
  return sql<{ id: string; name: string; capacity: number; floor: string; features: string[] }[]>`
    select id, name, capacity, floor, features from rooms order by floor, name`
}

export async function getBookingsForDate(date: string) {
  return sql<{ id: string; room_id: string; user_id: string; slot_start: string; slot_end: string; status: string; user_name: string }[]>`
    select b.id, b.room_id, b.user_id, b.slot_start, b.slot_end, b.status::text, u.name as user_name
    from room_bookings b join users u on u.id = b.user_id
    where (b.slot_start at time zone 'Asia/Dhaka')::date = ${date}::date
      and b.status in ('booked','checked_in')`
}

export async function getMyBookings(userId: string) {
  return sql<{ id: string; room_name: string; floor: string; slot_start: string; slot_end: string; status: string; checked_in_at: string | null }[]>`
    select b.id, r.name as room_name, r.floor, b.slot_start, b.slot_end, b.status::text, b.checked_in_at
    from room_bookings b join rooms r on r.id = b.room_id
    where b.user_id = ${userId} and b.slot_end > now() - interval '1 day' and b.status <> 'cancelled'
    order by b.slot_start`
}

export async function getOccupancy() {
  const latest = await sql<{ zone: string; seats_total: number; seats_taken: number; recorded_at: string }[]>`
    select distinct on (zone) zone, seats_total, seats_taken, recorded_at
    from occupancy_readings order by zone, recorded_at desc`
  const byHour = await sql<{ hour: number; pct: number }[]>`
    select extract(hour from recorded_at at time zone 'Asia/Dhaka')::int as hour,
           round(avg(seats_taken::numeric / nullif(seats_total,0)) * 100)::int as pct
    from occupancy_readings
    where recorded_at > now() - interval '7 days'
    group by 1 order by 1`
  return { latest, byHour }
}

/* ============================================================ notifications */

export async function getNotifications(userId: string, limit = 20) {
  return sql<NotificationRow[]>`
    select id, type, title, body, href, created_at, read_at
    from notifications where user_id = ${userId}
    order by created_at desc limit ${limit}`
}

export async function getUnreadCount(userId: string) {
  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count from notifications where user_id = ${userId} and read_at is null`
  return Number(count)
}

/* ============================================================ profile */

export async function getProfile(userId: string) {
  const [settings] = await sql<{ mode: string; use_history: boolean; use_trends: boolean }[]>`
    select mode::text, use_history, use_trends from reco_settings where user_id = ${userId}`
  const interests = await sql<{ id: string; name: string; selected: boolean; weight: number }[]>`
    select i.id, i.name, (ui.user_id is not null) as selected, coalesce(ui.weight,1) as weight
    from interests i left join user_interests ui on ui.interest_id = i.id and ui.user_id = ${userId}
    order by i.name`
  const [{ count: historyCount }] = await sql<{ count: string }[]>`
    select count(*)::text as count from loans where user_id = ${userId} and returned_at is not null`
  const saved = await sql<{ id: string; label: string; query: string; filters: Record<string, unknown> }[]>`
    select id, label, query, filters from saved_searches where user_id = ${userId} order by created_at desc`
  return {
    settings: settings ?? { mode: 'balanced', use_history: true, use_trends: true },
    interests,
    historyCount: Number(historyCount),
    saved,
  }
}

/* ============================================================ staff */

export async function getDeskStats() {
  const [row] = await sql<{ open_loans: number; overdue: number; holds_ready: number; holds_queued: number; today_issued: number; today_returned: number }[]>`
    select
      (select count(*)::int from loans where returned_at is null) as open_loans,
      (select count(*)::int from loans where returned_at is null and due_at < now()) as overdue,
      (select count(*)::int from holds where status='ready') as holds_ready,
      (select count(*)::int from holds where status='queued') as holds_queued,
      (select count(*)::int from loans
        where (issued_at at time zone 'Asia/Dhaka')::date = (now() at time zone 'Asia/Dhaka')::date) as today_issued,
      (select count(*)::int from loans
        where (returned_at at time zone 'Asia/Dhaka')::date = (now() at time zone 'Asia/Dhaka')::date) as today_returned`
  return row
}

export async function getOverdueList(limit = 25) {
  return sql<{ id: string; title: string; accession_number: string; user_name: string; uiu_id: string; due_at: string; days_late: number }[]>`
    select l.id, t.title, c.accession_number, u.name as user_name, u.uiu_id, l.due_at,
           (current_date - l.due_at::date)::int as days_late
    from loans l join titles t on t.id=l.title_id join copies c on c.id=l.copy_id join users u on u.id=l.user_id
    where l.returned_at is null and l.due_at < now()
    order by l.due_at asc limit ${limit}`
}

export async function getHoldQueue() {
  return sql<{ id: string; title: string; title_id: string; user_name: string; uiu_id: string; placed_at: string; status: string; ready_at: string | null; expires_at: string | null; copies_available: number; position: number }[]>`
    select h.id, t.title, t.id as title_id, u.name as user_name, u.uiu_id, h.placed_at, h.status::text, h.ready_at, h.expires_at,
           coalesce(av.copies_available,0) as copies_available,
           (select count(*)::int + 1 from holds h2 where h2.title_id=h.title_id and h2.status='queued' and h2.placed_at < h.placed_at) as position
    from holds h join titles t on t.id=h.title_id join users u on u.id=h.user_id
    left join title_availability av on av.title_id = t.id
    where h.status in ('queued','ready')
    order by h.status desc, h.placed_at asc`
}

export async function getReports() {
  const monthly = await sql<{ month: string; loans: number }[]>`
    select to_char(date_trunc('month', issued_at), 'Mon YYYY') as month, count(*)::int as loans
    from loans where issued_at > now() - interval '12 months'
    group by date_trunc('month', issued_at) order by date_trunc('month', issued_at)`
  const topTitles = await sql<{ title: string; id: string; loans: number; type: string }[]>`
    select t.title, t.id, t.type::text, count(l.id)::int as loans
    from titles t join loans l on l.title_id = t.id group by t.id order by loans desc limit 10`
  const byType = await sql<{ type: string; count: number }[]>`
    select type::text, count(*)::int from titles group by 1 order by 2 desc`
  const [fines] = await sql<{ charged: string; collected: string; outstanding: string }[]>`
    select
      coalesce((select sum(amount) from fines),0)::text as charged,
      coalesce((select sum(amount) from payments),0)::text as collected,
      coalesce((select sum(amount) from fines where status='unpaid'),0)::text as outstanding`
  const [totals] = await sql<{ titles: number; copies: number; users: number; lists: number }[]>`
    select (select count(*)::int from titles) as titles,
           (select count(*)::int from copies) as copies,
           (select count(*)::int from users) as users,
           (select count(*)::int from reading_lists) as lists`
  return { monthly, topTitles, byType, fines, totals }
}

export async function getCatalogueAdmin(q: string) {
  return sql<(TitleRow & { copies_total: number; copies_available: number; authors: string[] })[]>`
    select t.*, coalesce(av.copies_total,0) as copies_total, coalesce(av.copies_available,0) as copies_available,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors
    from titles t left join title_availability av on av.title_id=t.id
    ${q ? sql`where t.title ilike ${'%' + q + '%'}` : sql``}
    order by t.added_at desc limit 40`
}

export async function findMemberByCode(code: string) {
  const rows = await sql<{ id: string; name: string; uiu_id: string; role: string; department: string | null; avatar_hue: number; open_loans: number; outstanding: string }[]>`
    select u.id, u.name, u.uiu_id, u.role::text, u.department, u.avatar_hue,
           (select count(*)::int from loans l where l.user_id=u.id and l.returned_at is null) as open_loans,
           coalesce((select sum(f.amount) from fines f where f.user_id=u.id and f.status='unpaid'),0)::text as outstanding
    from users u where u.uiu_id = ${code} or u.email = ${code}`
  return rows[0] ?? null
}

export async function findCopyByAccession(accession: string) {
  const rows = await sql<{ id: string; accession_number: string; status: string; title: string; title_id: string; cover_hue: number; loan_id: string | null; borrower: string | null; due_at: string | null }[]>`
    select c.id, c.accession_number, c.status::text, t.title, t.id as title_id, t.cover_hue,
           l.id as loan_id, u.name as borrower, l.due_at
    from copies c join titles t on t.id = c.title_id
    left join loans l on l.copy_id = c.id and l.returned_at is null
    left join users u on u.id = l.user_id
    where c.accession_number = ${accession}`
  return rows[0] ?? null
}
