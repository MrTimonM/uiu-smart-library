import Link from 'next/link'
import { getRecommendations, REASON_GROUPS, WEIGHTS } from '@/lib/recommend'
import { getProfile } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { Empty, SectionHead, TitleGridCard } from '@/components/ui'
import { RecoMode } from '@/components/reco-mode'
import { IconSparkle } from '@/components/icons'

export const metadata = { title: 'For you' }

const SIGNALS = [
  { key: 'history', label: 'Borrowing history', weight: WEIGHTS.history },
  { key: 'interests', label: 'Your interests', weight: WEIGHTS.interests },
  { key: 'courses', label: 'Enrolled courses', weight: WEIGHTS.courses },
  { key: 'trends', label: 'Campus trends', weight: WEIGHTS.trends },
] as const

export default async function RecommendationsPage() {
  const user = await requireUser()
  const [recs, profile] = await Promise.all([
    getRecommendations(user.id, 24),
    getProfile(user.id),
  ])

  const grouped = REASON_GROUPS.map((g) => ({
    ...g,
    items: recs.filter((r) => r.reason_group === g.key),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHead
        eyebrow="Recommendations"
        title="For you"
        sub="Drawn only from titles the UIU Central Library actually holds — every suggestion says why it is being shown."
        action={<RecoMode settings={profile.settings} />}
      />

      {/* ---------------------------------------------- how it ranks */}
      <section className="card mb-7 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">How these are ranked</h2>
          <Link href="/profile" className="text-xs text-ink-3 link-underline">Tune the mix in your profile</Link>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full">
          {SIGNALS.map((s, i) => (
            <span
              key={s.key}
              className="block"
              style={{
                width: `${s.weight * 100 / 0.95}%`,
                background: `oklch(${58 - i * 5}% ${0.13 - i * 0.02} ${264 + i * 24})`,
              }}
            />
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {SIGNALS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: `oklch(${58 - i * 5}% ${0.13 - i * 0.02} ${264 + i * 24})` }}
              />
              <dt className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{s.label}</dt>
              <dd className="text-[13px] font-semibold tabular-nums">{Math.round(s.weight * 100)}%</dd>
            </div>
          ))}
        </dl>
        {(!profile.settings.use_history || !profile.settings.use_trends) && (
          <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            {!profile.settings.use_history && 'Borrowing history is switched off. '}
            {!profile.settings.use_trends && 'Campus trends are switched off. '}
            Ranking uses the remaining signals only.
          </p>
        )}
      </section>

      {recs.length === 0 ? (
        <Empty
          icon={<IconSparkle className="size-5" />}
          title="Not enough to go on yet"
          body="Borrow a few titles or pick some interests on your profile, and recommendations will start appearing here."
          action={<Link href="/profile" className="btn btn-primary">Pick your interests</Link>}
        />
      ) : (
        <div className="space-y-9">
          {grouped.map((g) => (
            <section key={g.key}>
              <div className="mb-3">
                <h2 className="display text-lg font-semibold">{g.label}</h2>
                <p className="text-sm text-ink-3">{g.blurb}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {g.items.map((r) => (
                  <TitleGridCard
                    key={r.id}
                    t={r}
                    badge={
                      <span className="line-clamp-2 block text-[11px] font-medium leading-snug text-brand" title={r.detail}>
                        {r.reason}
                      </span>
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
