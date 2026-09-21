import 'server-only'
import { NextResponse } from 'next/server'
import { RuleError } from './circulation'
import { getSession } from './session'
import type { SessionUser } from './types'

export type Handler<T> = (ctx: { user: SessionUser; body: T; req: Request }) => Promise<unknown>

/**
 * Wraps a route handler with the session check and a single, consistent error
 * shape. Business-rule failures come back as a readable message the UI shows
 * verbatim; anything else is logged and reported as a server error.
 */
export function route<T = Record<string, unknown>>(handler: Handler<T>, opts: { staff?: boolean } = {}) {
  return async (req: Request) => {
    try {
      const user = await getSession()
      if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
      if (opts.staff && user.role !== 'staff') {
        return NextResponse.json({ error: 'Library staff only.' }, { status: 403 })
      }
      let body = {} as T
      if (req.method !== 'GET' && req.headers.get('content-type')?.includes('json')) {
        body = (await req.json().catch(() => ({}))) as T
      }
      const data = await handler({ user, body, req })
      return NextResponse.json(data ?? { ok: true })
    } catch (err) {
      if (err instanceof RuleError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error('[api]', err)
      return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
    }
  }
}
