import { sql } from '@/lib/db'
import { route } from '@/lib/api'
import { RuleError } from '@/lib/circulation'

async function assertOwner(userId: string, listId: string) {
  const [owned] = await sql`select 1 from reading_lists where id = ${listId} and owner_id = ${userId}`
  if (!owned) throw new RuleError('That list is not yours', 403)
}

export const POST = route<{ listId: string; titleId: string }>(async ({ user, body }) => {
  await assertOwner(user.id, body.listId)
  await sql`insert into reading_list_items (list_id, title_id) values (${body.listId}, ${body.titleId})
            on conflict do nothing`
  return { ok: true }
})

/** Toggle an item between read and unread. */
export const PATCH = route<{ itemId: string; read: boolean }>(async ({ user, body }) => {
  const [row] = await sql<{ list_id: string }[]>`select list_id from reading_list_items where id = ${body.itemId}`
  if (!row) throw new RuleError('Item not found', 404)
  await assertOwner(user.id, row.list_id)
  await sql`update reading_list_items set read_at = ${body.read ? new Date() : null} where id = ${body.itemId}`
  return { ok: true }
})

export const DELETE = route<{ itemId: string }>(async ({ user, body }) => {
  const [row] = await sql<{ list_id: string }[]>`select list_id from reading_list_items where id = ${body.itemId}`
  if (!row) return { ok: true }
  await assertOwner(user.id, row.list_id)
  await sql`delete from reading_list_items where id = ${body.itemId}`
  return { ok: true }
})
