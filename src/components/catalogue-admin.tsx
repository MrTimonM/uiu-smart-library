'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { IconCheck, IconPlus, IconX } from './icons'

const ZONES = [
  'Ground Floor — Reading Hall',
  'First Floor — Stacks A',
  'First Floor — Stacks B',
  'Second Floor — Reference',
  'Second Floor — Periodicals',
]

/* ============================================================ new title */

export function NewTitleForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true); setError(null)
    try {
      const { id } = await api<{ id: string }>('/api/staff/titles', 'POST', {
        title: fd.get('title'),
        subtitle: fd.get('subtitle'),
        type: fd.get('type'),
        authors: fd.get('authors'),
        subjects: fd.get('subjects'),
        publisher: fd.get('publisher'),
        year: fd.get('year') ? Number(fd.get('year')) : undefined,
        isbn: fd.get('isbn'),
        summary: fd.get('summary'),
        copies: Number(fd.get('copies') ?? 0),
        zone: fd.get('zone'),
        bay: fd.get('bay'),
      })
      setOpen(false)
      router.push(`/titles/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <IconPlus className="size-4" /> Add a title
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4"
             onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }} role="dialog" aria-modal="true">
          <form onSubmit={submit} className="card rise my-auto w-full max-w-2xl p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-medium">Add a title to the catalogue</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <IconX className="size-4 text-ink-3" />
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="label-eyebrow">Title *</span>
                <input name="title" required autoFocus className="input mt-1.5" />
              </label>
              <label className="block sm:col-span-2">
                <span className="label-eyebrow">Subtitle</span>
                <input name="subtitle" className="input mt-1.5" />
              </label>
              <label className="block">
                <span className="label-eyebrow">Format</span>
                <select name="type" className="input mt-1.5" defaultValue="print">
                  <option value="print">Print book</option>
                  <option value="ebook">E-book</option>
                  <option value="journal">Journal</option>
                  <option value="thesis">UIU thesis</option>
                </select>
              </label>
              <label className="block">
                <span className="label-eyebrow">Year</span>
                <input name="year" inputMode="numeric" className="input mt-1.5" />
              </label>
              <label className="block sm:col-span-2">
                <span className="label-eyebrow">Authors — comma separated</span>
                <input name="authors" placeholder="Thomas H. Cormen, Charles E. Leiserson" className="input mt-1.5" />
              </label>
              <label className="block sm:col-span-2">
                <span className="label-eyebrow">Subjects — comma separated</span>
                <input name="subjects" placeholder="Computer Science, Algorithms" className="input mt-1.5" />
              </label>
              <label className="block">
                <span className="label-eyebrow">Publisher</span>
                <input name="publisher" className="input mt-1.5" />
              </label>
              <label className="block">
                <span className="label-eyebrow">ISBN</span>
                <input name="isbn" className="input mt-1.5" />
              </label>
              <label className="block sm:col-span-2">
                <span className="label-eyebrow">Summary</span>
                <textarea name="summary" rows={2} className="input mt-1.5 resize-y" />
              </label>

              <fieldset className="grid gap-3 rounded-lg border border-line p-3 sm:col-span-2 sm:grid-cols-3">
                <legend className="label-eyebrow px-1">Initial copies</legend>
                <label className="block">
                  <span className="text-[11px] text-ink-3">How many</span>
                  <input name="copies" type="number" min="0" max="20" defaultValue="3" className="input mt-1" />
                </label>
                <label className="block">
                  <span className="text-[11px] text-ink-3">Location</span>
                  <select name="zone" className="input mt-1">
                    {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-ink-3">Shelf bay</span>
                  <input name="bay" placeholder="A-1" defaultValue="A-1" className="input mt-1" />
                </label>
              </fieldset>

              {error && <p className="text-xs text-bad sm:col-span-2">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add to catalogue'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

/* ============================================================ row actions */

export function TitleAdminActions({
  titleId, title, copiesTotal,
}: { titleId: string; title: string; copiesTotal: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function addCopy() {
    setBusy(true); setError(null)
    try {
      const r = await api<{ accession: string }>('/api/staff/copies', 'POST', { titleId })
      setMsg(r.accession)
      setTimeout(() => setMsg(null), 2500)
      router.refresh()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  async function remove() {
    setBusy(true); setError(null)
    try {
      await api('/api/staff/titles', 'DELETE', { id: titleId })
      setConfirming(false)
      router.refresh()
    } catch (e) { setError((e as Error).message); setConfirming(false) } finally { setBusy(false) }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {confirming ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[11px] text-ink-3">Delete “{title.slice(0, 24)}…”?</span>
          <button className="btn btn-ghost px-2 py-1 text-xs text-bad" onClick={remove} disabled={busy}>Delete</button>
          <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setConfirming(false)}>Keep</button>
        </span>
      ) : (
        <span className="inline-flex gap-1.5">
          <button className="btn btn-ghost px-2 py-1 text-xs" onClick={addCopy} disabled={busy}>
            {msg ? <><IconCheck className="size-3.5 text-ok" /> {msg}</> : 'Add copy'}
          </button>
          <button className="btn btn-ghost px-2 py-1 text-xs text-ink-3" onClick={() => setConfirming(true)}
                  disabled={busy} title={copiesTotal ? `${copiesTotal} copies attached` : undefined}>
            Delete
          </button>
        </span>
      )}
      {error && <span className="max-w-[220px] text-right text-[11px] text-bad">{error}</span>}
    </div>
  )
}
