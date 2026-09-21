import Link from 'next/link'
import type { ReactNode } from 'react'
import { authorLine, daysUntil, initials, TYPE_SHORT } from '@/lib/format'
import type { SearchResult } from '@/lib/types'

/* ============================================================ cover art
   The plan puts cover images in Supabase Storage. Nothing in a seeded demo
   has real cover art, so each title gets a deterministic typographic cover
   derived from its stored hue — consistent everywhere the title appears. */

export function BookCover({
  title, hue, type, size = 'md', className = '',
}: {
  title: string; hue: number; type?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string
}) {
  const dims = {
    sm: 'w-10 h-14 text-[11px]',
    md: 'w-14 h-20 text-sm',
    lg: 'w-24 h-34 text-lg',
    xl: 'w-40 h-56 text-2xl',
  }[size]
  const isJournal = type === 'journal'
  const isThesis = type === 'thesis'

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[3px] ${dims} ${className}`}
      style={{
        background: `linear-gradient(150deg, oklch(58% 0.13 ${hue}), oklch(38% 0.11 ${hue + 18}))`,
        boxShadow: '0 1px 2px oklch(20% .02 265/.2), 0 10px 20px -12px oklch(20% .02 265/.5)',
      }}
      aria-hidden
    >
      {/* spine */}
      <div className="absolute inset-y-0 left-0 w-[11%] bg-black/20" />
      <div className="absolute inset-y-0 left-[11%] w-px bg-white/25" />
      {isJournal && <div className="absolute inset-x-[16%] top-[14%] h-px bg-white/40" />}
      <div className="absolute inset-0 grid place-items-center pl-[11%]">
        <span className="font-semibold tracking-tight text-white/95 display">{initials(title)}</span>
      </div>
      {isThesis && (
        <div className="absolute bottom-1.5 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-white/50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/15" />
    </div>
  )
}

/* ============================================================ availability */

export function Availability({
  available, total, nextDue, type, compact = false,
}: { available: number; total: number; nextDue?: string | null; type?: string; compact?: boolean }) {
  if (type === 'ebook') {
    return <span className="pill bg-brand-soft text-brand">Read online</span>
  }
  if (total === 0) {
    return <span className="pill bg-paper-2 text-ink-3">No copies</span>
  }
  if (available > 0) {
    return (
      <span className="pill bg-ok-soft text-ok">
        <span className="size-1.5 rounded-full bg-current" />
        {available} of {total} on shelf
      </span>
    )
  }
  return (
    <span className="pill bg-warn-soft text-warn">
      <span className="size-1.5 rounded-full bg-current" />
      {compact ? 'All out' : nextDue ? `All out · next back ${new Date(nextDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'All copies out'}
    </span>
  )
}

/* ============================================================ stars */

export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  const v = Math.round(Number(value) * 2) / 2
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
            <defs>
              <linearGradient id={`h${i}-${size}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.8l2.4 5 5.5.8-4 3.8.95 5.5L10 14.3l-4.85 2.6L6.1 11.4l-4-3.8 5.5-.8z"
              fill={fill === 1 ? 'currentColor' : fill === 0.5 ? `url(#h${i}-${size})` : 'none'}
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
              opacity={fill ? 1 : 0.28}
            />
          </svg>
        )
      })}
    </span>
  )
}

/* ============================================================ section head */

export function SectionHead({
  eyebrow, title, sub, action,
}: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="label-eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="display text-[26px] font-semibold leading-tight sm:text-[30px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/* ============================================================ empty state */

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="grid size-11 place-items-center rounded-full bg-paper-2 text-ink-3">{icon}</div>}
      <div>
        <p className="font-medium">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">{body}</p>}
      </div>
      {action}
    </div>
  )
}

/* ============================================================ stat */

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneClass = { default: 'text-ink', good: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone]
  return (
    <div className="card px-4 py-3.5">
      <div className="label-eyebrow">{label}</div>
      <div className={`display mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
    </div>
  )
}

/* ============================================================ title cards */

export function TitleRowCard({ t, footer }: { t: SearchResult; footer?: ReactNode }) {
  return (
    <article className="card group flex gap-4 p-4 transition hover:shadow-[var(--shadow-lift)]">
      <Link href={`/titles/${t.id}`} className="shrink-0">
        <BookCover title={t.title} hue={t.cover_hue} type={t.type} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-eyebrow">{TYPE_SHORT[t.type]}</span>
          {t.year && <span className="text-[11px] text-ink-3">· {t.year}</span>}
        </div>
        <h3 className="mt-0.5 truncate font-medium leading-snug">
          <Link href={`/titles/${t.id}`} className="hover:text-brand">{t.title}</Link>
        </h3>
        <p className="truncate text-sm text-ink-2">{authorLine(t.authors)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Availability available={t.copies_available} total={t.copies_total} nextDue={t.next_due} type={t.type} />
          {t.rating_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
              <Stars value={Number(t.rating_avg)} size={12} className="text-accent" />
              {Number(t.rating_avg).toFixed(1)} ({t.rating_count})
            </span>
          )}
        </div>
        {footer}
      </div>
    </article>
  )
}

export function TitleGridCard({ t, badge }: { t: SearchResult; badge?: ReactNode }) {
  return (
    <article className="card flex flex-col gap-3 p-4 transition hover:shadow-[var(--shadow-lift)]">
      <Link href={`/titles/${t.id}`} className="self-center">
        <BookCover title={t.title} hue={t.cover_hue} type={t.type} size="lg" />
      </Link>
      <div className="min-w-0">
        {badge}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/titles/${t.id}`} className="hover:text-brand">{t.title}</Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-3">{authorLine(t.authors, 1)}</p>
      </div>
      <div className="mt-auto pt-1">
        <Availability available={t.copies_available} total={t.copies_total} type={t.type} compact />
      </div>
    </article>
  )
}

/* ============================================================ due badge */

export function DueBadge({ due }: { due: string }) {
  const d = daysUntil(due)
  if (d < 0) return <span className="pill bg-bad-soft text-bad">{Math.abs(d)} day{Math.abs(d) > 1 ? 's' : ''} overdue</span>
  if (d === 0) return <span className="pill bg-warn-soft text-warn">Due today</span>
  if (d <= 3) return <span className="pill bg-warn-soft text-warn">Due in {d} day{d > 1 ? 's' : ''}</span>
  return <span className="pill bg-paper-2 text-ink-2">Due in {d} days</span>
}

/* ============================================================ avatar */

export function Avatar({ name, hue, size = 32 }: { name: string; hue: number; size?: number }) {
  const ini = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: `linear-gradient(140deg, oklch(62% 0.12 ${hue}), oklch(45% 0.12 ${hue + 25}))`,
      }}
      aria-hidden
    >
      {ini}
    </span>
  )
}
