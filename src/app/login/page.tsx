import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/session'
import { Avatar } from '@/components/ui'
import { UiuCrest } from '@/components/brand'
import { signIn } from '@/app/actions/auth'
import { IconChevron } from '@/components/icons'

export const metadata = { title: 'Sign in' }

interface Account {
  id: string; name: string; uiu_id: string; role: string; department: string | null; avatar_hue: number
}

export default async function LoginPage() {
  if (await getSession()) redirect('/search')

  const accounts = await sql<Account[]>`
    (select id, name, uiu_id, role::text, department, avatar_hue from users where role='student' order by uiu_id limit 4)
    union all
    (select id, name, uiu_id, role::text, department, avatar_hue from users where role='faculty' order by uiu_id limit 2)
    union all
    (select id, name, uiu_id, role::text, department, avatar_hue from users where role='staff' order by uiu_id limit 2)`

  const groups = [
    { role: 'student', label: 'Student', note: '5 items · 14 days' },
    { role: 'faculty', label: 'Faculty', note: '12 items · 30 days · course reserves' },
    { role: 'staff', label: 'Library staff', note: 'Circulation desk, catalogue, reports' },
  ]

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------------------------------------------- brand panel */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: 'linear-gradient(155deg, oklch(34% 0.12 264), oklch(22% 0.08 268) 55%, oklch(28% 0.1 300))' }}
      >
        <div className="relative">
          <div className="flex items-center gap-3">
            <UiuCrest size={38} plaque />
            <div className="text-xs leading-tight">
              <div className="font-semibold">United International University</div>
              <div className="text-white/60">Central Library</div>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Smart Library Platform
          </div>
          <h1 className="display mt-4 text-[42px] font-semibold leading-[1.08]">
            Search the shelves.<br />Borrow in one step.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            One catalogue for print, e-books, journals and UIU theses — with live availability down to the
            individual copy, and recommendations drawn only from titles the library actually holds.
          </p>
          <dl className="mt-9 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
            {[['42,180', 'Titles held'], ['61,904', 'Copies'], ['4,880', 'Students']].map(([v, k]) => (
              <div key={k}>
                <dt className="display text-2xl font-semibold">{v}</dt>
                <dd className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-white/45">{k}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-white/40">Team Ascent · Web Project</p>

        {/* decorative shelf lines */}
        <svg className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-[0.07]" viewBox="0 0 200 200" aria-hidden>
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 14 }).map((_, c) => (
              <rect key={`${r}-${c}`} x={6 + c * 14} y={10 + r * 21} width={9 - (c % 3)} height={17} rx="1" fill="white" />
            )),
          )}
        </svg>
      </section>

      {/* ---------------------------------------------------- sign-in panel */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <UiuCrest size={40} plaque />
            <h1 className="display mt-4 text-2xl font-semibold">Smart Library Platform</h1>
          </div>

          <div className="label-eyebrow mt-8 lg:mt-0">Single sign-on</div>
          <h2 className="display mt-1.5 text-[28px] font-semibold leading-tight">Sign in to the library</h2>
          <p className="mt-2 text-sm text-ink-2">
            Use the same credentials as UCAM. This build runs on seeded demo accounts — pick one to sign in.
          </p>

          <div className="mt-8 space-y-6">
            {groups.map((g) => {
              const list = accounts.filter((a) => a.role === g.role)
              if (!list.length) return null
              return (
                <div key={g.role}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="label-eyebrow">{g.label}</span>
                    <span className="text-[11px] text-ink-3">{g.note}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((a) => (
                      <form key={a.id} action={signIn.bind(null, a.id, a.role === 'staff' ? '/staff' : '/search')}>
                        <button
                          type="submit"
                          className="card group flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:shadow-[var(--shadow-lift)]"
                        >
                          <Avatar name={a.name} hue={a.avatar_hue} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{a.name}</span>
                            <span className="block truncate text-xs text-ink-3">
                              {a.uiu_id}{a.department ? ` · ${a.department}` : ''}
                            </span>
                          </span>
                          <IconChevron className="size-4 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-ink-3">
            In production this screen redirects to UIU single sign-on and no account list is shown. Roles,
            permissions and loan rules behave identically either way.
          </p>
        </div>
      </section>
    </main>
  )
}
