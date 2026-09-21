'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/session'

export async function signIn(userId: string, next = '/search') {
  const rows = await sql<{ id: string }[]>`select id from users where id = ${userId} and active`
  if (!rows[0]) throw new Error('Unknown account')
  const jar = await cookies()
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect(next)
}

export async function signInByCode(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim()
  const rows = await sql<{ id: string }[]>`
    select id from users where (uiu_id = ${code} or email = ${code}) and active`
  if (!rows[0]) return { error: 'No account with that UIU ID or email.' }
  await signIn(rows[0].id)
}

export async function signOut() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}

/** Role switcher — a demo convenience, not part of the production design. */
export async function switchUser(userId: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
}
