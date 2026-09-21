'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconBookmark, IconCheck, IconPlus, IconX } from './icons'

export function AddToList({
  titleId, lists, bookmarked,
}: {
  titleId: string
  lists: { id: string; name: string; item_count: number }[]
  bookmarked: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [marked, setMarked] = useState(bookmarked)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function toggleBookmark() {
    try {
      const r = await api<{ bookmarked: boolean }>('/api/bookmarks', 'POST', { titleId })
      setMarked(r.bookmarked)
      router.refresh()
    } catch (e) { setError((e as Error).message) }
  }

  async function addTo(listId: string) {
    try {
      await api('/api/lists/items', 'POST', { listId, titleId })
      setSaved(listId)
      router.refresh()
      setTimeout(() => { setOpen(false); setSaved(null) }, 900)
    } catch (e) { setError((e as Error).message) }
  }

  async function createAndAdd() {
    if (!newName.trim()) return
    try {
      const { id } = await api<{ id: string }>('/api/lists', 'POST', { name: newName })
      await addTo(id)
      setNewName('')
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button className="btn btn-ghost" onClick={toggleBookmark} aria-pressed={marked}>
          <IconBookmark className={`size-4 ${marked ? 'fill-current text-accent' : ''}`} />
          {marked ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
          <IconPlus className="size-4" /> Add to list
        </button>
      </div>

      {open && (
        <div className="card rise absolute left-0 top-12 z-30 w-72 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="label-eyebrow">Your reading lists</span>
            <button onClick={() => setOpen(false)} aria-label="Close"><IconX className="size-3.5 text-ink-3" /></button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {lists.length === 0 && <p className="px-3 py-4 text-center text-xs text-ink-3">No lists yet.</p>}
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => addTo(l.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-paper-2"
              >
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                {saved === l.id
                  ? <IconCheck className="size-4 shrink-0 text-ok" />
                  : <span className="shrink-0 text-[11px] text-ink-3">{l.item_count}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 border-t border-line p-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createAndAdd() }}
              placeholder="New list name"
              className="input px-2 py-1.5 text-xs"
            />
            <button className="btn btn-primary px-2.5 py-1.5 text-xs" onClick={createAndAdd}>Add</button>
          </div>
          {error && <p className="px-3 pb-2 text-xs text-bad">{error}</p>}
        </div>
      )}
    </div>
  )
}
