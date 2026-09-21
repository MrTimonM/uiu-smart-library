import { randomBytes } from 'node:crypto'
import { sql } from '@/lib/db'
import { route } from '@/lib/api'
import { RuleError } from '@/lib/circulation'

export const POST = route<{ name: string; description?: string; visibility?: string; courseId?: string }>(
  async ({ user, body }) => {
    const name = (body.name ?? '').trim()
    if (!name) throw new RuleError('Give the list a name.')
    const [row] = await sql<{ id: string }[]>`
      insert into reading_lists (owner_id, name, description, visibility, course_id, share_slug)
      values (${user.id}, ${name}, ${body.description?.trim() || null},
              ${body.visibility ?? 'private'}::list_visibility, ${body.courseId ?? null},
              ${randomBytes(5).toString('hex')})
      returning id`
    return { id: row!.id }
  })

export const PATCH = route<{ id: string; name?: string; visibility?: string }>(async ({ user, body }) => {
  const [owned] = await sql`select 1 from reading_lists where id = ${body.id} and owner_id = ${user.id}`
  if (!owned) throw new RuleError('That list is not yours', 403)
  if (body.name) await sql`update reading_lists set name = ${body.name.trim()} where id = ${body.id}`
  if (body.visibility) {
    await sql`update reading_lists set visibility = ${body.visibility}::list_visibility where id = ${body.id}`
  }
  return { ok: true }
})

export const DELETE = route<{ id: string }>(async ({ user, body }) => {
  await sql`delete from reading_lists where id = ${body.id} and owner_id = ${user.id}`
  return { ok: true }
})
