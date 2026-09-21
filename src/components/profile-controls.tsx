'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { api } from '@/lib/client'
import { IconCheck } from './icons'

/* ============================================================ interests */

export function InterestPicker({
  interests,
}: { interests: { id: string; name: string; selected: boolean }[] }) {
  const router = useRouter()
  const [picked, setPicked] = useState(() => new Set(interests.filter((i) => i.selected).map((i) => i.id)))
  const [saved, setSaved] = useState(false)
  const [, start] = useTransition()

  async function toggle(id: string) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
    await api('/api/profile', 'PATCH', { interests: [...next] })
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
    start(() => router.refresh())
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {interests.map((i) => {
          const on = picked.has(i.id)
          return (
            <button
              key={i.id}
              onClick={() => toggle(i.id)}
              aria-pressed={on}
              className={`pill border transition ${
                on ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-2 hover:border-brand hover:text-brand'
              }`}
            >
              {on && <IconCheck className="size-3" />}
              {i.name}
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-xs text-ink-3">
        {picked.size} of {interests.length} selected{saved && ' · saved'}
      </p>
    </div>
  )
}

/* ============================================================ switches */

function Switch({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block text-[11px] leading-snug text-ink-3">{hint}</span>
      </span>
    </label>
  )
}

export function PrivacySwitches({
  settings,
}: { settings: { mode: string; use_history: boolean; use_trends: boolean } }) {
  const router = useRouter()
  const [history, setHistory] = useState(settings.use_history)
  const [trends, setTrends] = useState(settings.use_trends)
  const [, start] = useTransition()

  async function save(patch: { useHistory?: boolean; useTrends?: boolean }) {
    await api('/api/profile', 'PATCH', patch)
    start(() => router.refresh())
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">Recommendation switches</h2>
      <p className="mt-0.5 text-xs text-ink-3">Turn a signal off entirely and ranking uses the rest.</p>
      <div className="mt-2 divide-y divide-line-2">
        <Switch
          label="Use my borrowing history"
          hint="42% of the ranking — the strongest signal."
          checked={history}
          onChange={(v) => { setHistory(v); save({ useHistory: v }) }}
        />
        <Switch
          label="Use campus trends"
          hint="9% — what other UIU readers are borrowing."
          checked={trends}
          onChange={(v) => { setTrends(v); save({ useTrends: v }) }}
        />
      </div>
    </section>
  )
}

/* ============================================================ clear history */

export function ClearHistory({ count }: { count: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function clear() {
    setBusy(true)
    try {
      await api('/api/profile', 'DELETE')
      setDone(true)
      setConfirming(false)
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">Borrowing history</h2>
      <p className="mt-0.5 text-xs text-ink-3">
        {done ? 'History cleared.' : `${count} returned ${count === 1 ? 'loan' : 'loans'} on record. Nothing is shared with other readers.`}
      </p>
      {confirming ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">
            This permanently removes your returned loans and the recommendations built on them. Items currently
            on loan are not affected.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1 text-bad" onClick={clear} disabled={busy}>
              {busy ? 'Clearing…' : 'Yes, clear it'}
            </button>
            <button className="btn btn-ghost flex-1" onClick={() => setConfirming(false)}>Keep</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost mt-3 w-full" onClick={() => setConfirming(true)} disabled={count === 0 || done}>
          Clear my history
        </button>
      )}
    </section>
  )
}
