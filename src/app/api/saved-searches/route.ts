import { sql } from '@/lib/db'
import { route } from '@/lib/api'

export const POST = route<{ label: string; query: string; filters: Record<string, string> }>(async ({ user, body }) => {
  const filters = JSON.stringify(body.filters ?? {})
  const [row] = await sql<{ id: string }[]>`
    insert into saved_searches (user_id, label, query, filters)
    values (${user.id}, ${body.label}, ${body.query ?? ''}, ${filters}::jsonb)
    returning id`
  return { id: row!.id }
})

export const DELETE = route<{ id: string }>(async ({ user, body }) => {
  await sql`delete from saved_searches where id = ${body.id} and user_id = ${user.id}`
  return { ok: true }
})
