'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconCheck, IconCopy, IconDownload, IconPlus, IconShare, IconX } from './icons'

/* ============================================================ new list */

export function NewListButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    setBusy(true); setError(null)
    try {
      const { id } = await api<{ id: string }>('/api/lists', 'POST', { name, visibility })
      setOpen(false); setName('')
      router.push(`/lists/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <IconPlus className="size-4" /> New list
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
             onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }} role="dialog" aria-modal="true">
          <div className="card rise w-full max-w-sm p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-medium">New reading list</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><IconX className="size-4 text-ink-3" /></button>
            </div>
            <div className="space-y-3 p-4">
              <label className="block">
                <span className="label-eyebrow">Name</span>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) create() }}
                       placeholder="Thesis sources" className="input mt-1.5" />
              </label>
              <label className="block">
                <span className="label-eyebrow">Visibility</span>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="input mt-1.5">
                  <option value="private">Private — only you</option>
                  <option value="link">Anyone with the link</option>
                  <option value="course">Course group</option>
                </select>
              </label>
              {error && <p className="text-xs text-bad">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={create} disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create list'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ============================================================ import course */

export function ImportCourseButton({
  courses,
}: { courses: { id: string; code: string; title: string; reserve_count: number }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importCourse(courseId: string) {
    setBusy(courseId); setError(null)
    try {
      const { id } = await api<{ id: string }>('/api/lists/import', 'POST', { courseId })
      setOpen(false)
      router.push(`/lists/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
        <IconDownload className="size-4" /> Import a course outline
      </button>
      {open && (
        <div className="card rise absolute right-0 top-11 z-30 w-72 overflow-hidden p-0">
          <div className="label-eyebrow border-b border-line px-3 py-2">Your enrolled courses</div>
          {courses.map((c) => (
            <button key={c.id} onClick={() => importCourse(c.id)} disabled={busy === c.id}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-paper-2">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{c.code}</span>
                <span className="block truncate text-[11px] text-ink-3">{c.title}</span>
              </span>
              <span className="shrink-0 text-[11px] text-ink-3">
                {busy === c.id ? '…' : `${c.reserve_count} titles`}
              </span>
            </button>
          ))}
          {error && <p className="px-3 pb-2 text-xs text-bad">{error}</p>}
        </div>
      )}
    </div>
  )
}

/* ============================================================ list detail */

export function ShareListButton({ slug, visibility, listId }: { slug: string; visibility: string; listId: string }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [vis, setVis] = useState(visibility)

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/lists/${listId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function setVisibility(next: string) {
    setVis(next)
    await api('/api/lists', 'PATCH', { id: listId, visibility: next })
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <select value={vis} onChange={(e) => setVisibility(e.target.value)} className="input w-auto py-1.5 text-xs"
              aria-label="List visibility">
        <option value="private">Private</option>
        <option value="link">Anyone with the link</option>
        <option value="course">Course group</option>
      </select>
      <button className="btn btn-ghost" onClick={copyLink} disabled={vis === 'private'}>
        {copied ? <IconCheck className="size-4 text-ok" /> : <IconShare className="size-4" />}
        {copied ? 'Link copied' : 'Share'}
      </button>
    </div>
  )
}

export function ItemActions({ itemId, read }: { itemId: string; read: boolean }) {
  const router = useRouter()
  const [isRead, setIsRead] = useState(read)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = !isRead
    setIsRead(next); setBusy(true)
    try {
      await api('/api/lists/items', 'PATCH', { itemId, read: next })
      router.refresh()
    } catch { setIsRead(!next) } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true)
    try {
      await api('/api/lists/items', 'DELETE', { itemId })
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={toggle} disabled={busy} aria-pressed={isRead}
              className={`pill border transition ${isRead ? 'border-ok bg-ok-soft text-ok' : 'border-line text-ink-3 hover:border-ok hover:text-ok'}`}>
        <IconCheck className="size-3.5" /> {isRead ? 'Read' : 'Mark read'}
      </button>
      <button onClick={remove} disabled={busy} aria-label="Remove from list"
              className="grid size-7 place-items-center rounded-md text-ink-3 transition hover:bg-bad-soft hover:text-bad">
        <IconX className="size-3.5" />
      </button>
    </div>
  )
}

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      await api('/api/lists', 'DELETE', { id: listId })
      router.push('/lists')
    } finally { setBusy(false) }
  }

  if (!confirming) {
    return <button className="btn btn-ghost text-ink-3" onClick={() => setConfirming(true)}>Delete list</button>
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-ink-3">Delete this list?</span>
      <button className="btn btn-ghost px-2 py-1 text-xs text-bad" onClick={remove} disabled={busy}>
        {busy ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setConfirming(false)}>Keep</button>
    </span>
  )
}

export function CopyIdButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn-ghost px-2 py-1 text-xs"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
    >
      {copied ? <IconCheck className="size-3.5 text-ok" /> : <IconCopy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
