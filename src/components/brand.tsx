/* eslint-disable @next/next/no-img-element */

/**
 * The UIU crest carries black lettering, so on any dark surface it sits on a
 * white plaque rather than being dropped straight onto the background.
 */
export function UiuCrest({
  size = 36, plaque = false, className = '',
}: { size?: number; plaque?: boolean; className?: string }) {
  const img = (
    <img
      src="/brand/uiu.png"
      alt=""
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  )
  if (!plaque) return <span className={`inline-flex shrink-0 ${className}`}>{img}</span>
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-lg bg-white ${className}`}
      style={{ width: size + 10, height: size + 10 }}
    >
      {img}
    </span>
  )
}

export function UiuLockup({ plaque = false }: { plaque?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <UiuCrest size={34} plaque={plaque} />
      <span className="min-w-0 text-[13px] leading-tight">
        <span className="block truncate font-semibold">Smart Library</span>
        <span className="block truncate text-[11px] opacity-70">UIU Central Library</span>
      </span>
    </span>
  )
}

/**
 * Generic payment-card mark. Deliberately not a Visa or Mastercard logo —
 * the library accepts any card, and showing a specific network's mark would
 * claim an acceptance relationship this project has not established.
 */
export function CardMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 28" className={className} role="img" aria-label="Payment card">
      <rect x="0.75" y="0.75" width="42.5" height="26.5" rx="3.5"
            fill="var(--color-card)" stroke="var(--color-ink-3)" strokeWidth="1.5" />
      <rect x="0.75" y="6" width="42.5" height="5" fill="var(--color-ink)" opacity="0.85" />
      <rect x="4.5" y="15" width="8" height="6" rx="1.5" fill="var(--color-accent)" opacity="0.9" />
      <rect x="4.5" y="15" width="8" height="6" rx="1.5" fill="none" stroke="var(--color-ink-3)" strokeWidth="0.6" />
      <path d="M6.5 15v6M10.5 15v6M4.5 18h8" stroke="var(--color-ink-3)" strokeWidth="0.5" />
      <rect x="16" y="18" width="7" height="2" rx="1" fill="var(--color-ink-3)" />
      <rect x="25" y="18" width="7" height="2" rx="1" fill="var(--color-ink-3)" />
      <rect x="34" y="18" width="5" height="2" rx="1" fill="var(--color-ink-3)" />
    </svg>
  )
}
