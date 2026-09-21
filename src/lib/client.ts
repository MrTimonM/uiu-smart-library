'use client'

/** Small fetch wrapper: every API route returns `{ error }` on failure. */
export async function api<T = Record<string, unknown>>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Something went wrong.')
  return data as T
}

export function buildQuery(base: Record<string, string | number | boolean | undefined>, patch: Record<string, string | number | boolean | undefined | null> = {}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v === undefined || v === null || v === '' || v === false) continue
    params.set(k, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}
