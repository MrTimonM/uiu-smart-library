'use client'

/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { money } from '@/lib/format'
import { IconCheck } from './icons'
import { CardMark } from './brand'

export type PayMethod = 'bkash' | 'rocket' | 'card'

export const METHOD_LABEL: Record<string, string> = {
  bkash: 'bKash',
  rocket: 'Rocket',
  nagad: 'Nagad',
  card: 'Card',
}

const METHODS: { key: PayMethod; label: string }[] = [
  { key: 'bkash', label: 'bKash' },
  { key: 'rocket', label: 'Rocket' },
  { key: 'card', label: 'Card' },
]

export function MethodMark({ method, className = 'h-6' }: { method: string; className?: string }) {
  if (method === 'bkash') {
    return <img src="/brand/bkash.webp" alt="bKash" className={`${className} w-auto object-contain`} />
  }
  if (method === 'rocket') {
    return <img src="/brand/rocket.png" alt="Rocket" className={`${className} w-auto object-contain`} />
  }
  if (method === 'nagad') {
    return <span className={`${className} grid place-items-center text-[13px] font-bold tracking-tight text-[#ec1c24]`}>Nagad</span>
  }
  return <CardMark className={`${className} w-auto`} />
}

export function PayBox({ outstanding }: { outstanding: number }) {
  const router = useRouter()
  const [method, setMethod] = useState<PayMethod>('bkash')
  const [stage, setStage] = useState<'idle' | 'paying' | 'done'>('idle')
  const [receipt, setReceipt] = useState<{ total: number; reference: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setStage('paying'); setError(null)
    try {
      const r = await api<{ total: number; reference: string }>('/api/payments', 'POST', { method })
      setReceipt(r)
      setStage('done')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
      setStage('idle')
    }
  }

  if (stage === 'done' && receipt) {
    return (
      <section className="card p-4 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-ok-soft text-ok">
          <IconCheck className="size-5" />
        </div>
        <h2 className="display mt-3 text-lg font-semibold">Payment received</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-ink-2">
          {money(receipt.total)} settled by
          <span className="inline-grid h-6 place-items-center rounded bg-white px-1.5">
            <MethodMark method={method} className="h-4" />
          </span>
        </p>
        <p className="mt-2 rounded-lg bg-paper-2 px-3 py-2 font-mono text-xs text-ink-2">{receipt.reference}</p>
        <p className="mt-3 text-xs text-ink-3">Your account is clear for semester sign-off.</p>
      </section>
    )
  }

  if (outstanding <= 0) {
    return (
      <section className="card p-4 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-ok-soft text-ok">
          <IconCheck className="size-5" />
        </div>
        <h2 className="mt-3 text-sm font-medium">Nothing outstanding</h2>
        <p className="mt-1 text-xs text-ink-3">Your account is clear for semester sign-off.</p>
      </section>
    )
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">Pay from anywhere</h2>
      <p className="mt-0.5 text-xs text-ink-3">No queue at the desk.</p>

      <div className="mt-3 rounded-lg bg-paper-2 px-3 py-3 text-center">
        <div className="label-eyebrow">Amount due</div>
        <div className="display mt-0.5 text-3xl font-semibold tabular-nums text-bad">{money(outstanding)}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Payment method">
        {METHODS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMethod(m.key)}
            aria-pressed={method === m.key}
            aria-label={m.label}
            className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
              method === m.key ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-2 hover:bg-paper-2'
            }`}
          >
            <span className="mx-auto mb-1.5 grid h-7 place-items-center rounded-md bg-white px-1">
              <MethodMark method={m.key} className="h-5" />
            </span>
            {m.label}
          </button>
        ))}
      </div>

      <button className="btn btn-primary mt-3 w-full" onClick={pay} disabled={stage === 'paying'}>
        {stage === 'paying' ? 'Processing…' : `Pay ${money(outstanding)}`}
      </button>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      <p className="mt-2.5 text-[11px] leading-snug text-ink-3">
        Simulated gateway — no live merchant account is wired up in this build. The charge settles and the
        receipt is written to your ledger exactly as it would in production.
      </p>
    </section>
  )
}
