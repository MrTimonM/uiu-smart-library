import { sql } from '@/lib/db'
import { route } from '@/lib/api'

export const POST = route<{ id?: string }>(async ({ user, body }) => {
  if (body.id) {
    await sql`update notifications set read_at = now() where id = ${body.id} and user_id = ${user.id}`
  } else {
    await sql`update notifications set read_at = now() where user_id = ${user.id} and read_at is null`
  }
  return { ok: true }
})
