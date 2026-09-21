'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconBookmark, IconCheck } from './icons'

export function SaveSearch({
  query, filters, saved,
}: {
  query: string
  filters: Record<string, string>
  saved: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const label = query || Object.values(filters)[0] || ''
  const already = saved.some((s) => s.label.toLowerCase() === label.toLowerCase())
  if (!label) return null

  async function save() {
    setState('saving')
    setError(null)
    try {
      await api('/api/saved-searches', 'POST', { label, query, filters })
      setState('done')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
      setState('idle')
    }
  }

  return (
    <div className="text-right">
      <button className="btn btn-ghost" onClick={save} disabled={state !== 'idle' || already}>
        {already || state === 'done' ? <IconCheck className="size-4 text-ok" /> : <IconBookmark className="size-4" />}
        {already || state === 'done' ? 'Search saved' : state === 'saving' ? 'Saving…' : 'Save this search'}
      </button>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  )
}
