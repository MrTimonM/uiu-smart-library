import Link from 'next/link'
import { getMyCourses, getProfile } from '@/lib/queries'
import { getLoanRules } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { Avatar, SectionHead } from '@/components/ui'
import { InterestPicker, PrivacySwitches, ClearHistory } from '@/components/profile-controls'

export const metadata = { title: 'Profile & privacy' }

export default async function ProfilePage() {
  const user = await requireUser()
  const [profile, courses, rules] = await Promise.all([
    getProfile(user.id),
    getMyCourses(user.id),
    getLoanRules(user.role),
  ])

  const ROLE_LABEL: Record<string, string> = { student: 'Student', faculty: 'Faculty', staff: 'Library staff' }

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHead
        eyebrow="Your account"
        title="Profile, privacy & ranking"
        sub="You control what feeds your recommendations. Nothing about your reading is shared with other readers."
      />

      {/* ---------------------------------------------- identity */}
      <section className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={user.name} hue={user.avatar_hue} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="display text-xl font-semibold">{user.name}</h2>
          <p className="text-sm text-ink-2">
            {ROLE_LABEL[user.role]}{user.department ? ` · ${user.department}` : ''} · {user.uiu_id}
          </p>
          <p className="text-xs text-ink-3">{user.email}</p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="label-eyebrow">Loan limit</dt>
            <dd className="mt-0.5 font-medium">{rules.max_items} items</dd>
          </div>
          <div>
            <dt className="label-eyebrow">Loan period</dt>
            <dd className="mt-0.5 font-medium">{rules.loan_days} days</dd>
          </div>
          <div>
            <dt className="label-eyebrow">Renewals</dt>
            <dd className="mt-0.5 font-medium">{rules.max_renewals}×</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* ------------------------------------- interests */}
          <section className="card p-5">
            <h2 className="display text-lg font-semibold">Interest topics</h2>
            <p className="mt-0.5 text-sm text-ink-2">
              Pick what gets weighted highest for you. Interests carry 26% of the ranking.
            </p>
            <InterestPicker interests={profile.interests} />
          </section>

          {/* ------------------------------------- courses */}
          <section className="card p-5">
            <h2 className="display text-lg font-semibold">Course sync</h2>
            <p className="mt-0.5 text-sm text-ink-2">
              Reserve lists follow the courses you are enrolled in — 18% of the ranking.
            </p>
            {courses.length === 0 ? (
              <p className="mt-3 text-sm text-ink-3">No enrolments on record for this semester.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {courses.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">{c.code}</span>
                      <span className="block truncate text-[11px] text-ink-3">{c.title}</span>
                    </span>
                    {c.reserve_count > 0 && (
                      <span className="shrink-0 pill bg-accent-soft text-accent">{c.reserve_count} on reserve</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------- saved searches */}
          {profile.saved.length > 0 && (
            <section className="card p-5">
              <h2 className="display text-lg font-semibold">Saved searches</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.saved.map((s) => (
                  <Link
                    key={s.id}
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="pill border border-line transition hover:border-brand hover:text-brand"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* --------------------------------------- privacy */}
        <aside className="space-y-5">
          <PrivacySwitches settings={profile.settings} />
          <ClearHistory count={profile.historyCount} />

          <section className="card p-4">
            <h2 className="text-sm font-medium">What is shared</h2>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-2">
              <li>Your borrowing history is never shown to other readers.</li>
              <li>Ratings and written reviews appear under your name.</li>
              <li>Private lists stay private until you change their visibility.</li>
              <li>Recommendations are computed for you alone.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
