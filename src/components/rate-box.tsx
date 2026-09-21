'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconCheck } from './icons'

export function RateBox({
  titleId, existing,
}: { titleId: string; existing: { stars: number; review: string | null } | null }) {
  const router = useRouter()
  const [stars, setStars] = useState(existing?.stars ?? 0)
  const [hover, setHover] = useState(0)
  const [review, setReview] = useState(existing?.review ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!stars) { setError('Pick a star rating first.'); return }
    setState('saving'); setError(null)
    try {
      await api('/api/ratings', 'POST', { titleId, stars, review })
      setState('saved')
      router.refresh()
      setTimeout(() => setState('idle'), 2200)
    } catch (e) {
      setError((e as Error).message)
      setState('idle')
    }
  }

  const shown = hover || stars

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{existing ? 'Your rating' : 'Rate this title'}</span>
        <span className="text-[11px] text-ink-3">Ratings feed back into your recommendations</span>
      </div>

      <div className="mt-2.5 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onClick={() => setStars(i)}
            onMouseEnter={() => setHover(i)}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            className="p-0.5 transition hover:scale-110"
          >
            <svg width="24" height="24" viewBox="0 0 20 20" className={shown >= i ? 'text-accent' : 'text-ink-3'}>
              <path
                d="M10 1.8l2.4 5 5.5.8-4 3.8.95 5.5L10 14.3l-4.85 2.6L6.1 11.4l-4-3.8 5.5-.8z"
                fill={shown >= i ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
                opacity={shown >= i ? 1 : 0.4}
              />
            </svg>
          </button>
        ))}
        {stars > 0 && <span className="ml-1.5 text-sm text-ink-2">{stars} of 5</span>}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={2}
        placeholder="Add a short review for other UIU readers (optional)"
        className="input mt-2.5 resize-y"
      />

      <div className="mt-2.5 flex items-center gap-2">
        <button className="btn btn-primary" onClick={submit} disabled={state === 'saving'}>
          {state === 'saved' ? <><IconCheck className="size-4" /> Saved</> : state === 'saving' ? 'Saving…' : existing ? 'Update rating' : 'Post rating'}
        </button>
        {error && <span className="text-xs text-bad">{error}</span>}
      </div>
    </div>
  )
}
