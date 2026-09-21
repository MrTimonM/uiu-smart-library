import { sql } from '@/lib/db'
import { route } from '@/lib/api'

export const PATCH = route<{
  mode?: 'balanced' | 'close' | 'surprise'
  useHistory?: boolean
  useTrends?: boolean
  interests?: string[]
}>(async ({ user, body }) => {
  if (body.mode || body.useHistory !== undefined || body.useTrends !== undefined) {
    await sql`
      insert into reco_settings (user_id, mode, use_history, use_trends)
      values (${user.id}, ${body.mode ?? 'balanced'}::reco_mode,
              ${body.useHistory ?? true}, ${body.useTrends ?? true})
      on conflict (user_id) do update set
        mode        = coalesce(${body.mode ?? null}::reco_mode, reco_settings.mode),
        use_history = coalesce(${body.useHistory ?? null}::boolean, reco_settings.use_history),
        use_trends  = coalesce(${body.useTrends ?? null}::boolean, reco_settings.use_trends)`
  }
  if (body.interests) {
    await sql`delete from user_interests where user_id = ${user.id}`
    if (body.interests.length) {
      await sql`insert into user_interests ${sql(body.interests.map((id) => ({ user_id: user.id, interest_id: id })))}`
    }
  }
  return { ok: true }
})

/**
 * Clear borrowing history. Nothing is shared with other readers, and the
 * reader can wipe the signal that feeds recommendations at any time.
 */
export const DELETE = route(async ({ user }) => {
  const rows = await sql`delete from loans where user_id = ${user.id} and returned_at is not null returning id`
  return { cleared: rows.length }
})
