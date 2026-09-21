import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/session'

/** Demo role switcher. Not part of the production sign-on design. */
export async function POST(req: Request) {
  const { userId } = await req.json()
  const rows = await sql<{ id: string }[]>`select id from users where id = ${userId} and active`
  if (!rows[0]) return NextResponse.json({ error: 'Unknown account' }, { status: 404 })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  return NextResponse.json({ ok: true })
}
