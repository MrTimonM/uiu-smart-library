'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { Avatar } from './ui'
import { UiuCrest } from './brand'
import {
  IconBell, IconBook, IconChart, IconChevron, IconDesk, IconDoor, IconGrid,
  IconList, IconLogout, IconMenu, IconMoon, IconSearch, IconSparkle, IconSun,
  IconUser, IconWallet, IconX,
} from './icons'
import type { NotificationRow, SessionUser } from '@/lib/types'
import { timeAgo } from '@/lib/format'

const STUDENT_NAV = [
  { href: '/search', label: 'Catalogue', icon: IconSearch },
  { href: '/loans', label: 'Loans & holds', icon: IconBook },
  { href: '/recommendations', label: 'For you', icon: IconSparkle },
  { href: '/lists', label: 'Reading lists', icon: IconList },
  { href: '/rooms', label: 'Study rooms', icon: IconDoor },
  { href: '/fines', label: 'Fines', icon: IconWallet },
  { href: '/profile', label: 'Profile', icon: IconUser },
]

const STAFF_NAV = [
  { href: '/staff', label: 'Circulation desk', icon: IconDesk },
  { href: '/staff/holds', label: 'Hold queue', icon: IconBook },
  { href: '/staff/catalogue', label: 'Catalogue', icon: IconGrid },
  { href: '/staff/reports', label: 'Reports', icon: IconChart },
]

export function Shell({
  user, unread, notifications, accounts, children,
}: {
  user: SessionUser
  unread: number
  notifications: NotificationRow[]
  accounts: SessionUser[]
  children: ReactNode
}) {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = user.role === 'staff' ? [...STAFF_NAV, ...STUDENT_NAV.slice(0, 1)] : STUDENT_NAV

  useEffect(() => { setMobileOpen(false) }, [path])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* ------------------------------------------------------- sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[248px] shrink-0 border-r border-line bg-card transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 px-4 py-4">
            <UiuCrest size={30} plaque />
            <div className="min-w-0 text-[13px] leading-tight">
              <div className="truncate font-semibold">Smart Library</div>
              <div className="truncate text-[11px] text-ink-3">UIU Central Library</div>
            </div>
            <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <IconX className="size-5 text-ink-3" />
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2">
            {user.role === 'staff' && <div className="label-eyebrow px-2.5 pb-1.5 pt-2">Back office</div>}
            {nav.map((item, i) => {
              const active = item.href === '/search' ? path.startsWith('/search') || path.startsWith('/titles')
                : item.href === '/staff' ? path === '/staff'
                : path.startsWith(item.href)
              const Icon = item.icon
              return (
                <div key={item.href}>
                  {user.role === 'staff' && i === STAFF_NAV.length && (
                    <div className="label-eyebrow px-2.5 pb-1.5 pt-4">Reader view</div>
                  )}
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                      active ? 'bg-brand-soft font-medium text-brand' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                    }`}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    {item.label}
                  </Link>
                </div>
              )
            })}
          </nav>

          <div className="border-t border-line p-2.5">
            <AccountMenu user={user} accounts={accounts} />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      {/* ------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <IconMenu className="size-5" />
          </button>
          <QuickSearch />
          <NotificationBell unread={unread} items={notifications} />
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-line px-4 py-5 text-xs text-ink-3 sm:px-6 lg:px-8">
          UIU Central Library · Smart Library Platform — a Team Ascent web project.
          Fines accrue at ৳10 per item per day.
        </footer>
      </div>
    </div>
  )
}

/* ============================================================ quick search */

interface Suggestion { id: string; title: string; type: string; cover_hue: number; authors: string[] }

function QuickSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const path = usePathname()
  const [q, setQ] = useState(path === '/search' ? (params.get('q') ?? '') : '')
  const [hits, setHits] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const boxRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (path === '/search') setQ(params.get('q') ?? '')
    setOpen(false)
  }, [path, params])

  // debounced typeahead against the catalogue
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        const data = await res.json()
        setHits(data.results ?? [])
        setCursor(-1)
      } catch { /* aborted */ }
    }, 180)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [q])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % hits.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + hits.length) % hits.length) }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); router.push(`/titles/${hits[cursor]!.id}`); setOpen(false) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <form
      ref={boxRef}
      className="relative flex-1"
      onSubmit={(e) => {
        e.preventDefault()
        setOpen(false)
        router.push(`/search?q=${encodeURIComponent(q)}`)
      }}
      role="search"
    >
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search the catalogue — title, author, subject, ISBN"
        aria-label="Search the catalogue"
        aria-expanded={open && hits.length > 0}
        aria-autocomplete="list"
        className="input py-2 pl-9 pr-3"
      />

      {open && hits.length > 0 && (
        <ul className="card rise absolute left-0 right-0 top-11 z-30 overflow-hidden p-0" role="listbox">
          {hits.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === cursor}>
              <Link
                href={`/titles/${h.id}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setCursor(i)}
                className={`flex items-center gap-3 border-b border-line-2 px-3 py-2 transition last:border-0 ${
                  i === cursor ? 'bg-paper-2' : ''
                }`}
              >
                <span
                  className="h-8 w-6 shrink-0 rounded-[2px]"
                  style={{ background: `linear-gradient(150deg, oklch(58% .13 ${h.cover_hue}), oklch(38% .11 ${h.cover_hue + 18}))` }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{h.title}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {h.authors[0] ?? 'Unknown author'} · {h.type}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <button
              type="submit"
              className="w-full border-t border-line px-3 py-2 text-left text-[12px] text-brand transition hover:bg-paper-2"
            >
              See all results for “{q}”
            </button>
          </li>
        </ul>
      )}
    </form>
  )
}

/* ============================================================ notifications */

function NotificationBell({ unread, items }: { unread: number; items: NotificationRow[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [, start] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function markAll() {
    await fetch('/api/notifications/read', { method: 'POST' })
    start(() => router.refresh())
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-ghost relative size-9 p-0"
        onClick={() => { setOpen((o) => !o); if (!open && unread) markAll() }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <IconBell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card rise absolute right-0 top-11 z-30 w-[330px] overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="text-sm font-medium">Notifications</span>
            <span className="text-[11px] text-ink-3">In-app only</span>
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {items.length === 0 && <p className="px-3.5 py-8 text-center text-sm text-ink-3">Nothing yet.</p>}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? '#'}
                onClick={() => setOpen(false)}
                className="block border-b border-line-2 px-3.5 py-3 transition last:border-0 hover:bg-paper-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-sm ${n.read_at ? 'font-normal' : 'font-medium'}`}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(n.created_at)}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{n.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================ theme */

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const saved = (localStorage.getItem('uiu-theme') as 'light' | 'dark' | null)
    setTheme(saved ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('uiu-theme', next) } catch {}
  }

  return (
    <button className="btn btn-ghost size-9 p-0" onClick={toggle} aria-label="Switch colour theme">
      {theme === 'dark' ? <IconSun className="size-[18px]" /> : <IconMoon className="size-[18px]" />}
    </button>
  )
}

/* ============================================================ account */

function AccountMenu({ user, accounts }: { user: SessionUser; accounts: SessionUser[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [, start] = useTransition()

  async function switchTo(id: string) {
    await fetch('/api/session/switch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    setOpen(false)
    start(() => { router.push(accounts.find((a) => a.id === id)?.role === 'staff' ? '/staff' : '/search'); router.refresh() })
  }

  const ROLE_LABEL: Record<string, string> = { student: 'Student', faculty: 'Faculty', staff: 'Library staff' }

  return (
    <div className="relative">
      {open && (
        <div className="card rise absolute bottom-full left-0 mb-2 w-full overflow-hidden p-0">
          <div className="label-eyebrow border-b border-line px-3 py-2">Switch role · demo</div>
          <div className="max-h-64 overflow-y-auto">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => switchTo(a.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-paper-2 ${
                  a.id === user.id ? 'bg-brand-soft' : ''
                }`}
              >
                <Avatar name={a.name} hue={a.avatar_hue} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{a.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">{ROLE_LABEL[a.role]}</span>
                </span>
              </button>
            ))}
          </div>
          <form action="/api/session/signout" method="post" className="border-t border-line">
            <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink-2 transition hover:bg-paper-2">
              <IconLogout className="size-4" /> Sign out
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-paper-2"
      >
        <Avatar name={user.name} hue={user.avatar_hue} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user.name}</span>
          <span className="block truncate text-[11px] text-ink-3">{ROLE_LABEL[user.role]} · {user.uiu_id}</span>
        </span>
        <IconChevron className={`size-4 shrink-0 text-ink-3 transition ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
    </div>
  )
}
