import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, ...p,
})

export const IconSearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
export const IconBook = (p: P) => <svg {...base(p)}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19v5H6.5A2.5 2.5 0 0 1 4 18.5z" /></svg>
export const IconSparkle = (p: P) => <svg {...base(p)}><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" /><path d="M18.5 3.5v3M20 5h-3" /></svg>
export const IconList = (p: P) => <svg {...base(p)}><path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
export const IconDoor = (p: P) => <svg {...base(p)}><path d="M14 3H6v18h8" /><path d="M14 3l4 2v14l-4 2z" /><circle cx="15.5" cy="12" r=".8" fill="currentColor" stroke="none" /></svg>
export const IconWallet = (p: P) => <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none" /></svg>
export const IconBell = (p: P) => <svg {...base(p)}><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 20a2 2 0 0 0 3 0" /></svg>
export const IconUser = (p: P) => <svg {...base(p)}><circle cx="12" cy="8.5" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
export const IconDesk = (p: P) => <svg {...base(p)}><path d="M3 9h18M5 9v11M19 9v11M3 9l2-5h14l2 5" /><path d="M9 14h6" /></svg>
export const IconChart = (p: P) => <svg {...base(p)}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 20v-6M13 20v-10M18 20v-4" /></svg>
export const IconCheck = (p: P) => <svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>
export const IconX = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
export const IconClock = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
export const IconAlert = (p: P) => <svg {...base(p)}><path d="M12 4.5 2.8 20h18.4z" /><path d="M12 10v4.5M12 17.5h.01" /></svg>
export const IconMapPin = (p: P) => <svg {...base(p)}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
export const IconRefresh = (p: P) => <svg {...base(p)}><path d="M20 11a8 8 0 0 0-14-4.5L4 9" /><path d="M4 5v4h4" /><path d="M4 13a8 8 0 0 0 14 4.5L20 15" /><path d="M20 19v-4h-4" /></svg>
export const IconBookmark = (p: P) => <svg {...base(p)}><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /></svg>
export const IconQuote = (p: P) => <svg {...base(p)}><path d="M9 7H5.5A1.5 1.5 0 0 0 4 8.5v3A1.5 1.5 0 0 0 5.5 13H8v1.5A2.5 2.5 0 0 1 5.5 17" /><path d="M19 7h-3.5A1.5 1.5 0 0 0 14 8.5v3a1.5 1.5 0 0 0 1.5 1.5H18v1.5a2.5 2.5 0 0 1-2.5 2.5" /></svg>
export const IconCopy = (p: P) => <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
export const IconChevron = (p: P) => <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>
export const IconFilter = (p: P) => <svg {...base(p)}><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
export const IconShare = (p: P) => <svg {...base(p)}><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></svg>
export const IconLogout = (p: P) => <svg {...base(p)}><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M11 8l-4 4 4 4M7 12h9" /></svg>
export const IconSun = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
export const IconMoon = (p: P) => <svg {...base(p)}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
export const IconMenu = (p: P) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
export const IconGrid = (p: P) => <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
export const IconRows = (p: P) => <svg {...base(p)}><rect x="3.5" y="4.5" width="17" height="5" rx="1.5" /><rect x="3.5" y="14.5" width="17" height="5" rx="1.5" /></svg>
export const IconDownload = (p: P) => <svg {...base(p)}><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 19h14" /></svg>
