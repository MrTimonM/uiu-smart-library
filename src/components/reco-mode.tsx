'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { api } from '@/lib/client'

const MODES = [
  { key: 'close', label: 'Close to my reading' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'surprise', label: 'Surprise me' },
] as const

export function RecoMode({
  settings,
}: { settings: { mode: string; use_history: boolean; use_trends: boolean } }) {
  const router = useRouter()
  const [mode, setMode] = useState(settings.mode)
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function pick(next: string) {
    const prev = mode
    setMode(next)
    try {
      await api('/api/profile', 'PATCH', { mode: next })
      start(() => router.refresh())
    } catch (e) {
      setMode(prev)
      setError((e as Error).message)
    }
  }

  return (
    <div>
      <div className="inline-flex rounded-lg border border-line bg-card p-0.5" role="group" aria-label="Recommendation mix">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => pick(m.key)}
            aria-pressed={mode === m.key}
            className={`rounded-[7px] px-3 py-1.5 text-[13px] transition ${
              mode === m.key ? 'bg-brand-soft font-medium text-brand' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-right text-xs text-bad">{error}</p>}
    </div>
  )
}
