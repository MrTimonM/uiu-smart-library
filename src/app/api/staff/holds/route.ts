import { sql } from '@/lib/db'
import { route } from '@/lib/api'
import { RuleError } from '@/lib/circulation'

/** Desk actions on the hold queue: mark ready, mark collected, or expire. */
export const PATCH = route<{ holdId: string; action: 'ready' | 'collected' | 'expire' }>(
  async ({ body }) => {
    const [hold] = await sql<{ id: string; title_id: string; copy_id: string | null; user_id: string; title: string }[]>`
      select h.id, h.title_id, h.copy_id, h.user_id, t.title
      from holds h join titles t on t.id = h.title_id where h.id = ${body.holdId}`
    if (!hold) throw new RuleError('Reservation not found', 404)

    if (body.action === 'ready') {
      const [free] = await sql<{ id: string }[]>`
        select id from copies where title_id = ${hold.title_id} and status = 'available' limit 1`
      if (!free) throw new RuleError('No copy is free to hold yet.')
      await sql`update holds set status='ready', copy_id=${free.id}, ready_at=now(),
                expires_at = now() + interval '48 hours' where id = ${hold.id}`
      await sql`update copies set status='held' where id = ${free.id}`
      await sql`insert into notifications (user_id, type, title, body, href) values
        (${hold.user_id}, 'hold_ready', 'Ready for pickup',
         ${`“${hold.title}” is waiting at the circulation desk. Collect it within 48 hours.`}, '/loans')`
      return { ok: true }
    }

    if (body.action === 'collected') {
      await sql`update holds set status='collected' where id = ${hold.id}`
      return { ok: true }
    }

    await sql`update holds set status='expired' where id = ${hold.id}`
    if (hold.copy_id) {
      // pass the copy to the next reader in the queue, if there is one
      const [next] = await sql<{ id: string; user_id: string }[]>`
        select id, user_id from holds where title_id = ${hold.title_id} and status='queued'
        order by placed_at limit 1`
      if (next) {
        await sql`update holds set status='ready', copy_id=${hold.copy_id}, ready_at=now(),
                  expires_at = now() + interval '48 hours' where id = ${next.id}`
        await sql`insert into notifications (user_id, type, title, body, href) values
          (${next.user_id}, 'hold_ready', 'Ready for pickup',
           ${`“${hold.title}” is now waiting at the circulation desk.`}, '/loans')`
      } else {
        await sql`update copies set status='available' where id = ${hold.copy_id}`
      }
    }
    return { ok: true }
  }, { staff: true })
