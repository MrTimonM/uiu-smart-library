import { sql } from '@/lib/db'
import { route } from '@/lib/api'

export const POST = route<{ titleId: string }>(async ({ user, body }) => {
  const [existing] = await sql`select 1 from bookmarks where user_id = ${user.id} and title_id = ${body.titleId}`
  if (existing) {
    await sql`delete from bookmarks where user_id = ${user.id} and title_id = ${body.titleId}`
    return { bookmarked: false }
  }
  await sql`insert into bookmarks (user_id, title_id) values (${user.id}, ${body.titleId})`
  return { bookmarked: true }
})
