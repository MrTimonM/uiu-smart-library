'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'

export function HoldActions({
  holdId, status, canReady = false,
}: { holdId: string; status: string; canReady?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'ready' | 'collected' | 'expire') {
    setBusy(true); setError(null)
    try {
      await api('/api/staff/holds', 'PATCH', { holdId, action })
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex gap-1.5">
        {status === 'ready' ? (
          <>
            <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => act('collected')} disabled={busy}>
              Collected
            </button>
            <button className="btn btn-ghost px-2 py-1 text-xs text-bad" onClick={() => act('expire')} disabled={busy}>
              Expire
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => act('ready')} disabled={busy || !canReady}>
              Mark ready
            </button>
            <button className="btn btn-ghost px-2 py-1 text-xs text-bad" onClick={() => act('expire')} disabled={busy}>
              Remove
            </button>
          </>
        )}
      </div>
      {error && <span className="text-[11px] text-bad">{error}</span>}
    </div>
  )
}
