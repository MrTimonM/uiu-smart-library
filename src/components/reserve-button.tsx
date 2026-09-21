'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconAlert, IconBook, IconCheck, IconClock } from './icons'
import { formatDate } from '@/lib/format'

export function ReserveButton({
  titleId, type, available, hold, onLoan, queueLength,
}: {
  titleId: string
  type: string
  available: number
  hold: { id: string; status: string; queue_position: number } | null
  onLoan: { id: string; due_at: string } | null
  queueLength: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: string; position: number } | null>(null)

  async function reserve() {
    setBusy(true); setError(null)
    try {
      const r = await api<{ status: string; position: number }>('/api/holds', 'POST', { titleId })
      setResult(r)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function cancel(holdId: string) {
    setBusy(true); setError(null)
    try {
      await api('/api/holds', 'DELETE', { holdId })
      setResult(null)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (type === 'ebook') {
    return (
      <div className="min-w-0">
        <button className="btn btn-primary" onClick={() => setResult({ status: 'reader', position: 0 })}>
          <IconBook className="size-4" /> Read online
        </button>
        {result?.status === 'reader' ? (
          <p className="mt-1.5 max-w-xs rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
            The licensed reader opens here in production. Access rule: on campus, no reservation needed.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-ink-3">Digital — available instantly, no reservation needed.</p>
        )}
      </div>
    )
  }

  if (onLoan) {
    return (
      <div className="pill bg-brand-soft px-3 py-2 text-brand">
        <IconCheck className="size-4" /> You have this out · due {formatDate(onLoan.due_at)}
      </div>
    )
  }

  const current = result
    ? { status: result.status, queue_position: result.position, id: '' }
    : hold

  if (current) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {current.status === 'ready' ? (
            <span className="pill bg-ok-soft px-3 py-2 text-ok">
              <IconCheck className="size-4" /> Ready at the desk — collect within 48 hours
            </span>
          ) : (
            <span className="pill bg-warn-soft px-3 py-2 text-warn">
              <IconClock className="size-4" /> In the queue — position {current.queue_position}
            </span>
          )}
          {hold?.id && (
            <button className="btn btn-ghost" onClick={() => cancel(hold.id)} disabled={busy}>
              Cancel reservation
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-bad">{error}</p>}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <button className="btn btn-primary" onClick={reserve} disabled={busy}>
        <IconBook className="size-4" />
        {busy ? 'Reserving…' : available > 0 ? 'Reserve — held 48 hours' : 'Join the queue'}
      </button>
      <p className="mt-1.5 max-w-xs text-xs text-ink-3">
        {available > 0
          ? 'A copy is pulled and held at the circulation desk for 48 hours.'
          : `All copies are out. ${queueLength > 0 ? `${queueLength} ahead of you.` : 'You would be first in the queue.'}`}
      </p>
      {error && (
        <p className="mt-1.5 inline-flex items-start gap-1.5 text-xs text-bad">
          <IconAlert className="mt-px size-3.5 shrink-0" />{error}
        </p>
      )}
    </div>
  )
}
