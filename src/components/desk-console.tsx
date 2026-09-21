'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client'
import { money, formatDate } from '@/lib/format'
import { IconAlert, IconCheck, IconDesk } from './icons'

type Log = { id: number; ok: boolean; text: string; detail?: string }

export function DeskConsole() {
  const router = useRouter()
  const [tab, setTab] = useState<'issue' | 'return'>('issue')
  const [accession, setAccession] = useState('')
  const [member, setMember] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<Log[]>([])

  function push(entry: Omit<Log, 'id'>) {
    setLog((l) => [{ ...entry, id: Date.now() }, ...l].slice(0, 8))
  }

  async function issue() {
    setBusy(true)
    try {
      const r = await api<{ member: string; title: string; due_at: string }>('/api/desk/issue', 'POST', { accession, member })
      push({ ok: true, text: `Issued “${r.title}” to ${r.member}`, detail: `Due back ${formatDate(r.due_at)}` })
      setAccession('')
      router.refresh()
    } catch (e) {
      push({ ok: false, text: (e as Error).message })
    } finally { setBusy(false) }
  }

  async function accept() {
    setBusy(true)
    try {
      const r = await api<{ title: string; daysLate: number; fine: number; promoted: boolean }>(
        '/api/desk/return', 'POST', { accession },
      )
      push({
        ok: true,
        text: `Returned “${r.title}”`,
        detail: [
          r.daysLate > 0 ? `${r.daysLate} day${r.daysLate > 1 ? 's' : ''} late — ${money(r.fine)} posted` : 'On time',
          r.promoted ? 'passed to the next reader in the queue' : 'back on the shelf',
        ].join(' · '),
      })
      setAccession('')
      router.refresh()
    } catch (e) {
      push({ ok: false, text: (e as Error).message })
    } finally { setBusy(false) }
  }

  const canSubmit = tab === 'issue' ? accession.trim() && member.trim() : accession.trim()

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex border-b border-line">
        {(['issue', 'return'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              tab === t ? 'border-b-2 border-brand text-brand' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {t === 'issue' ? 'Issue an item' : 'Accept a return'}
          </button>
        ))}
      </div>

      <form
        className="space-y-3 p-4"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) (tab === 'issue' ? issue() : accept()) }}
      >
        <label className="block">
          <span className="label-eyebrow">Accession number</span>
          <input
            autoFocus
            value={accession}
            onChange={(e) => setAccession(e.target.value)}
            placeholder="UIU-100123"
            className="input mt-1.5 font-mono"
          />
        </label>

        {tab === 'issue' && (
          <label className="block">
            <span className="label-eyebrow">Member ID or email</span>
            <input
              value={member}
              onChange={(e) => setMember(e.target.value)}
              placeholder="11220001"
              className="input mt-1.5 font-mono"
            />
          </label>
        )}

        <button className="btn btn-primary w-full" disabled={!canSubmit || busy}>
          <IconDesk className="size-4" />
          {busy ? 'Working…' : tab === 'issue' ? 'Issue' : 'Accept return'}
        </button>

        <p className="text-[11px] leading-snug text-ink-3">
          {tab === 'issue'
            ? 'Checks the loan limit, reference restrictions, and whether the copy is being held for another reader.'
            : 'Posts any overdue charge at ৳10 per day and passes the copy to the next reader in the queue.'}
        </p>
      </form>

      {log.length > 0 && (
        <div className="border-t border-line">
          <div className="label-eyebrow px-4 py-2">Session log</div>
          <ul className="divide-y divide-line-2">
            {log.map((l) => (
              <li key={l.id} className="flex items-start gap-2.5 px-4 py-2.5">
                {l.ok
                  ? <IconCheck className="mt-0.5 size-4 shrink-0 text-ok" />
                  : <IconAlert className="mt-0.5 size-4 shrink-0 text-bad" />}
                <span className="min-w-0">
                  <span className={`block text-[13px] ${l.ok ? '' : 'text-bad'}`}>{l.text}</span>
                  {l.detail && <span className="block text-[11px] text-ink-3">{l.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
