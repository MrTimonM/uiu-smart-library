'use client'

import { useState } from 'react'
import { IconCheck, IconCopy, IconQuote, IconX } from './icons'

interface Citable {
  title: string
  subtitle: string | null
  authors: string[]
  publisher: string | null
  year: number | null
  edition: string | null
  type: string
  isbn: string | null
}

/** APA 7: Surname, F. M. — flips "Firstname M. Surname" from the catalogue. */
function apaName(name: string) {
  const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!
  const surname = parts.pop()!
  return `${surname}, ${parts.map((p) => `${p[0]!.toUpperCase()}.`).join(' ')}`
}

function apa(t: Citable) {
  const names = t.authors.map(apaName)
  const authors =
    names.length === 0 ? '' :
    names.length === 1 ? names[0]! :
    names.length <= 20 ? `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}` :
    `${names.slice(0, 19).join(', ')}, ... ${names.at(-1)}`
  const full = t.subtitle ? `${t.title}: ${t.subtitle}` : t.title
  const ed = t.edition ? ` (${t.edition})` : ''
  const pub = t.type === 'thesis'
    ? ' [Undergraduate thesis, United International University]'
    : t.publisher ? ` ${t.publisher}.` : ''
  return `${authors}${authors ? ' ' : ''}(${t.year ?? 'n.d.'}). *${full}*${ed}.${pub}`.replace(/\*/g, '')
}

function bibtex(t: Citable) {
  const first = t.authors[0]?.split(/\s+/).pop()?.toLowerCase().replace(/\W/g, '') ?? 'anon'
  const key = `${first}${t.year ?? ''}`
  const entry = t.type === 'thesis' ? 'phdthesis' : t.type === 'journal' ? 'article' : 'book'
  const lines = [
    `@${entry}{${key},`,
    `  title     = {${t.title}${t.subtitle ? `: ${t.subtitle}` : ''}},`,
    `  author    = {${t.authors.join(' and ')}},`,
    t.year ? `  year      = {${t.year}},` : '',
    t.publisher ? `  publisher = {${t.publisher}},` : '',
    t.edition ? `  edition   = {${t.edition}},` : '',
    t.isbn ? `  isbn      = {${t.isbn}},` : '',
    '}',
  ].filter(Boolean)
  return lines.join('\n')
}

export function CiteBox({ title }: { title: Citable }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const formats = [
    { key: 'APA 7', text: apa(title) },
    { key: 'BibTeX', text: bibtex(title) },
  ]

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        <IconQuote className="size-4" /> Cite
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Citation"
        >
          <div className="card rise w-full max-w-lg p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-medium">Ready-made citation</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><IconX className="size-4 text-ink-3" /></button>
            </div>
            <div className="space-y-4 p-4">
              {formats.map((f) => (
                <div key={f.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="label-eyebrow">{f.key}</span>
                    <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => copy(f.key, f.text)}>
                      {copied === f.key ? <><IconCheck className="size-3.5 text-ok" /> Copied</> : <><IconCopy className="size-3.5" /> Copy</>}
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-paper-2 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink-2">
                    {f.text}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
