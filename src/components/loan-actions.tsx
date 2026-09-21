'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconCheck, IconRefresh } from './icons'
import { formatDate } from '@/lib/format'

export function RenewButton({
  loanId, renewals, maxRenewals, blocked, queued,
}: { loanId: string; renewals: number; maxRenewals: number; blocked: boolean; queued: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exhausted = renewals >= maxRenewals

  async function renew() {
    setBusy(true); setError(null)
    try {
      const r = await api<{ due_at: string }>('/api/loans/renew', 'POST', { loanId })
      setMsg(`Renewed to ${formatDate(r.due_at)}`)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-[160px] text-right">
      <button className="btn btn-ghost" onClick={renew} disabled={busy || blocked || exhausted}>
        {msg ? <IconCheck className="size-4 text-ok" /> : <IconRefresh className="size-4" />}
        {msg ?? (busy ? 'Renewing…' : 'Renew')}
      </button>
      <p className="mt-1 text-[11px] leading-snug text-ink-3">
        {blocked
          ? `${queued} reader${queued > 1 ? 's are' : ' is'} waiting — cannot renew`
          : exhausted
            ? `Renewed ${renewals} of ${maxRenewals} times`
            : `${maxRenewals - renewals} renewal${maxRenewals - renewals > 1 ? 's' : ''} left`}
      </p>
      {error && <p className="mt-1 text-[11px] text-bad">{error}</p>}
    </div>
  )
}

export function CancelHoldButton({ holdId }: { holdId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancel() {
    setBusy(true); setError(null)
    try {
      await api('/api/holds', 'DELETE', { holdId })
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="text-right">
      <button className="btn btn-ghost" onClick={cancel} disabled={busy}>
        {busy ? 'Cancelling…' : 'Cancel'}
      </button>
      {error && <p className="mt-1 text-[11px] text-bad">{error}</p>}
    </div>
  )
}
