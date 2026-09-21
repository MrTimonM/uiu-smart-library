import { cookies } from 'next/headers'
import { cache } from 'react'
import { sql } from './db'
import type { SessionUser } from './types'

export const SESSION_COOKIE = 'uiu_lib_uid'

/**
 * Mock authentication. The deck specifies UIU single sign-on (same credentials
 * as UCAM); there is no UCAM endpoint available to a student project, so the
 * session is a signed-in user id held in a cookie and the login screen lists
 * the seeded accounts. Everything downstream — permissions, ownership checks,
 * loan rules — behaves exactly as it would behind real SSO.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (!id) return null
  const rows = await sql<SessionUser[]>`
    select id, uiu_id, name, email, role, department, avatar_hue
    from users where id = ${id} and active limit 1`
  return rows[0] ?? null
})

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'staff') throw new Error('FORBIDDEN')
  return user
}
