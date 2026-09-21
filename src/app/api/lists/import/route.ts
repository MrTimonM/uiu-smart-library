import { randomBytes } from 'node:crypto'
import { sql } from '@/lib/db'
import { route } from '@/lib/api'
import { RuleError } from '@/lib/circulation'

/** Pull a course's reserve list into a new reading list. */
export const POST = route<{ courseId: string }>(async ({ user, body }) => {
  const [course] = await sql<{ id: string; code: string; title: string }[]>`
    select c.id, c.code, c.title from courses c
    join enrollments e on e.course_id = c.id and e.user_id = ${user.id}
    where c.id = ${body.courseId}`
  if (!course) throw new RuleError('You are not enrolled in that course.')

  const reserves = await sql<{ title_id: string }[]>`
    select title_id from course_reserves where course_id = ${course.id}`
  if (reserves.length === 0) throw new RuleError('That course has no reserve list yet.')

  const [list] = await sql<{ id: string }[]>`
    insert into reading_lists (owner_id, name, description, visibility, course_id, share_slug)
    values (${user.id}, ${`${course.code} — ${course.title}`}, 'Imported from the course reserve list.',
            'course', ${course.id}, ${randomBytes(5).toString('hex')})
    returning id`
  await sql`insert into reading_list_items ${sql(reserves.map((r) => ({ list_id: list!.id, title_id: r.title_id })))}
            on conflict do nothing`
  return { id: list!.id, count: reserves.length }
})
