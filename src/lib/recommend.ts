import 'server-only'
import { sql } from './db'
import type { Recommendation } from './types'

/**
 * Recommendation ranking — the four signals and weights specified in the
 * project deck. Candidates are drawn *only* from titles the library holds,
 * and every suggestion carries the reason it was shown.
 */
export const WEIGHTS = {
  history: 0.42,
  interests: 0.26,
  courses: 0.18,
  trends: 0.09,
  freshness: 0.05, // recency + diversity jitter
} as const

export const MODE_TILT = {
  balanced: { history: 1, interests: 1, courses: 1, trends: 1 },
  close: { history: 1.45, interests: 1.15, courses: 1, trends: 0.4 },
  surprise: { history: 0.5, interests: 0.8, courses: 0.7, trends: 1.6 },
} as const

interface Raw {
  id: string
  title: string
  subtitle: string | null
  type: string
  cover_hue: number
  year: number | null
  publisher: string | null
  summary: string | null
  rating_avg: string
  rating_count: number
  borrow_count: number
  added_at: string
  language: string
  isbn: string | null
  issn: string | null
  edition: string | null
  pages: number | null
  authors: string[]
  subjects: string[]
  copies_total: number
  copies_available: number
  next_due: string | null
  history_score: number
  interest_score: number
  course_score: number
  trend_score: number
  freshness: number
  history_via: string | null
  author_via: string | null
  interest_via: string | null
  course_via: string | null
  peer_count: number
}

export async function getRecommendations(userId: string, limit = 18): Promise<Recommendation[]> {
  const [settings] = await sql<{ mode: keyof typeof MODE_TILT; use_history: boolean; use_trends: boolean }[]>`
    select mode::text as mode, use_history, use_trends from reco_settings where user_id = ${userId}`
  const mode = settings?.mode ?? 'balanced'
  const useHistory = settings?.use_history ?? true
  const useTrends = settings?.use_trends ?? true
  const tilt = MODE_TILT[mode] ?? MODE_TILT.balanced

  const rows = await sql<Raw[]>`
    with
    -- subjects the reader has actually borrowed, weighted by how often
    my_subjects as (
      select ts.subject_id, count(*)::numeric as n
      from loans l join title_subjects ts on ts.title_id = l.title_id
      where l.user_id = ${userId} group by 1
    ),
    my_subject_max as (select coalesce(max(n),1) as m from my_subjects),
    -- authors the reader has borrowed before
    my_authors as (
      select ta.author_id, count(*)::numeric as n
      from loans l join title_authors ta on ta.title_id = l.title_id
      where l.user_id = ${userId} group by 1
    ),
    -- stated interests, mapped onto subject names
    my_interests as (
      select i.name, ui.weight::numeric from user_interests ui
      join interests i on i.id = ui.interest_id where ui.user_id = ${userId}
    ),
    -- reserves for the courses the reader is enrolled in
    my_reserves as (
      select cr.title_id, c.code
      from enrollments e join courses c on c.id = e.course_id
      join course_reserves cr on cr.course_id = c.id
      where e.user_id = ${userId}
    ),
    -- what readers with overlapping history borrowed
    peers as (
      select l2.user_id from loans l1 join loans l2 on l2.title_id = l1.title_id
      where l1.user_id = ${userId} and l2.user_id <> ${userId} group by l2.user_id
      having count(distinct l1.title_id) >= 1
    ),
    peer_borrows as (
      select l.title_id, count(distinct l.user_id)::numeric as n
      from loans l where l.user_id in (select user_id from peers) group by 1
    ),
    peer_max as (select coalesce(max(n),1) as m from peer_borrows),
    trend as (
      select l.title_id, count(*)::numeric as n from loans l
      where l.issued_at > now() - interval '90 days' group by 1
    ),
    trend_max as (select coalesce(max(n),1) as m from trend),
    -- already read, on loan, or held: never recommend these
    excluded as (
      select title_id from loans where user_id = ${userId}
      union select title_id from holds where user_id = ${userId} and status in ('queued','ready')
      union select title_id from bookmarks where user_id = ${userId}
    )
    select t.id, t.title, t.subtitle, t.type::text, t.cover_hue, t.year, t.publisher, t.summary,
           t.rating_avg::text, t.rating_count, t.borrow_count, t.added_at, t.language,
           t.isbn, t.issn, t.edition, t.pages,
           coalesce((select array_agg(a.name order by ta.ord) from title_authors ta
                     join authors a on a.id=ta.author_id where ta.title_id=t.id),'{}') as authors,
           coalesce((select array_agg(s.name order by s.name) from title_subjects ts
                     join subjects s on s.id=ts.subject_id where ts.title_id=t.id),'{}') as subjects,
           coalesce(av.copies_total,0) as copies_total,
           coalesce(av.copies_available,0) as copies_available,
           av.next_due,

           -- signal 1: borrowing history (shared subjects + shared authors)
           least(1, coalesce((
             select sum(ms.n) / (select m from my_subject_max) / 2
             from title_subjects ts join my_subjects ms on ms.subject_id = ts.subject_id
             where ts.title_id = t.id), 0)
             + coalesce((select 0.45 from title_authors ta join my_authors ma on ma.author_id = ta.author_id
                         where ta.title_id = t.id limit 1), 0))::float8 as history_score,

           -- signal 2: stated interests
           least(1, coalesce((
             select sum(mi.weight) / 6.0 from title_subjects ts join subjects s on s.id = ts.subject_id
             join my_interests mi on mi.name = s.name where ts.title_id = t.id), 0))::float8 as interest_score,

           -- signal 3: enrolled-course reserves
           (case when exists (select 1 from my_reserves r where r.title_id = t.id) then 1 else 0 end)::float8 as course_score,

           -- signal 4: campus trends + readers like you
           greatest(
             coalesce((select n from trend where title_id = t.id), 0) / (select m from trend_max),
             coalesce((select n from peer_borrows where title_id = t.id), 0) / (select m from peer_max)
           )::float8 as trend_score,

           -- recency of acquisition, gently
           greatest(0, 1 - extract(epoch from (now() - t.added_at)) / (86400 * 540))::float8 as freshness,

           -- name the most *specific* shared subject, not the broadest one:
           -- "Machine Learning" tells the reader more than "Computer Science".
           (select s.name from title_subjects ts join subjects s on s.id=ts.subject_id
            join my_subjects ms on ms.subject_id = ts.subject_id
            where ts.title_id = t.id
            order by (select count(*) from title_subjects x where x.subject_id = s.id) asc, ms.n desc
            limit 1) as history_via,
           (select a.name from title_authors ta join authors a on a.id = ta.author_id
            join my_authors ma on ma.author_id = ta.author_id
            where ta.title_id = t.id order by ma.n desc limit 1) as author_via,
           (select s.name from title_subjects ts join subjects s on s.id=ts.subject_id
            join my_interests mi on mi.name = s.name where ts.title_id = t.id limit 1) as interest_via,
           (select r.code from my_reserves r where r.title_id = t.id limit 1) as course_via,
           coalesce((select n from peer_borrows where title_id = t.id), 0)::int as peer_count
    from titles t
    left join title_availability av on av.title_id = t.id
    where t.id not in (select title_id from excluded)
    limit 400`

  const scored = rows.map((r) => {
    const h = useHistory ? r.history_score * WEIGHTS.history * tilt.history : 0
    const i = r.interest_score * WEIGHTS.interests * tilt.interests
    const c = r.course_score * WEIGHTS.courses * tilt.courses
    const tr = useTrends ? r.trend_score * WEIGHTS.trends * tilt.trends : 0
    const f = r.freshness * WEIGHTS.freshness
    const quality = (Number(r.rating_avg) / 5) * 0.04
    const score = h + i + c + tr + f + quality

    // The explanation always names the signal that contributed most.
    const parts: [Recommendation['reason_group'], number, string, string][] = [
      ['history', h,
        r.author_via ? `Because you borrowed ${r.author_via}`
        : r.history_via ? `More on ${r.history_via}`
        : 'Close to your reading',
        r.author_via ? `You have borrowed ${r.author_via} before.`
        : r.history_via ? `${r.history_via} comes up repeatedly in your borrowing history.`
        : 'Matches the subjects in your borrowing history.'],
      ['interests', i, r.interest_via ? `Matches your interest in ${r.interest_via}` : 'Matches your interests',
        `${r.interest_via ?? 'One of your topics'} is one of the interests on your profile.`],
      ['courses', c, r.course_via ? `On reserve for ${r.course_via}` : 'On your course reserve list',
        `Course reserve for ${r.course_via ?? 'a course you are enrolled in'}.`],
      ['trending', tr, r.peer_count > 2 ? 'Readers like you borrowed this' : 'Trending on campus',
        r.peer_count > 2
          ? `${r.peer_count} readers with borrowing history like yours took this out.`
          : 'One of the most-borrowed titles at the library over the last 90 days.'],
    ]
    parts.sort((a, b) => b[1] - a[1])
    const [group, , reason, detail] = parts[0]!

    return {
      ...r,
      rating_avg: r.rating_avg,
      score,
      reason,
      detail,
      reason_group: group,
    } as unknown as Recommendation
  })

  scored.sort((a, b) => b.score - a.score)

  // diversity: at most 3 per leading subject so one topic cannot flood the page
  const perSubject = new Map<string, number>()
  const out: Recommendation[] = []
  for (const r of scored) {
    if (r.score <= 0.02) continue
    const key = r.reason
    const n = perSubject.get(key) ?? 0
    if (n >= 3) continue
    perSubject.set(key, n + 1)
    out.push(r)
    if (out.length >= limit) break
  }
  return out
}

export const REASON_GROUPS: { key: Recommendation['reason_group']; label: string; blurb: string }[] = [
  { key: 'history', label: 'Because you borrowed', blurb: 'Drawn from the subjects and authors already in your history.' },
  { key: 'courses', label: 'For your courses', blurb: 'Reserve lists for the courses you are enrolled in this semester.' },
  { key: 'interests', label: 'Matches your interests', blurb: 'Based on the topics you picked on your profile.' },
  { key: 'trending', label: 'Trending at UIU', blurb: 'Most borrowed across campus over the last 90 days.' },
  { key: 'similar', label: 'Readers like you', blurb: 'Borrowed by students with a reading history close to yours.' },
]
