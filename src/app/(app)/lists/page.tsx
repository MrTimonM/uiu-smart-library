import Link from 'next/link'
import { getBookmarks, getMyCourses, getMyLists } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { Empty, SectionHead, TitleGridCard } from '@/components/ui'
import { NewListButton, ImportCourseButton } from '@/components/list-actions'
import { IconBookmark, IconList } from '@/components/icons'

export const metadata = { title: 'Reading lists' }

const VISIBILITY: Record<string, { label: string; cls: string }> = {
  private: { label: 'Private', cls: 'bg-paper-2 text-ink-3' },
  link: { label: 'Shared by link', cls: 'bg-brand-soft text-brand' },
  course: { label: 'Course group', cls: 'bg-accent-soft text-accent' },
}

export default async function ListsPage() {
  const user = await requireUser()
  const [lists, bookmarks, courses] = await Promise.all([
    getMyLists(user.id),
    getBookmarks(user.id),
    getMyCourses(user.id),
  ])

  const importable = courses.filter((c) => c.reserve_count > 0)

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead
        eyebrow="Reading lists"
        title="Organise by course"
        sub="Course reading, thesis sources, holiday picks. Private by default — share a list with a course group when you want to."
        action={
          <div className="flex gap-2">
            {importable.length > 0 && <ImportCourseButton courses={importable} />}
            <NewListButton />
          </div>
        }
      />

      {lists.length === 0 ? (
        <Empty
          icon={<IconList className="size-5" />}
          title="No lists yet"
          body="Build a list for a course, a thesis, or anything you want to come back to."
          action={<NewListButton />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => {
            const pct = l.item_count ? Math.round((l.read_count / l.item_count) * 100) : 0
            return (
              <Link key={l.id} href={`/lists/${l.id}`} className="card group flex flex-col gap-3 p-4 transition hover:shadow-[var(--shadow-lift)]">
                {/* spine stack preview */}
                <div className="flex h-16 items-end gap-1 overflow-hidden">
                  {(l.hues.length ? l.hues.slice(0, 9) : [220]).map((h, i) => (
                    <span
                      key={i}
                      className="block w-3 rounded-[2px]"
                      style={{
                        height: `${58 + ((i * 37) % 26)}%`,
                        background: `linear-gradient(160deg, oklch(60% 0.12 ${h}), oklch(40% 0.1 ${h + 20}))`,
                      }}
                    />
                  ))}
                  {l.item_count === 0 && <span className="text-xs text-ink-3">Empty list</span>}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`pill ${VISIBILITY[l.visibility]?.cls}`}>{VISIBILITY[l.visibility]?.label}</span>
                    {l.course_code && <span className="text-[11px] text-ink-3">{l.course_code}</span>}
                  </div>
                  <h2 className="mt-1.5 truncate font-medium group-hover:text-brand">{l.name}</h2>
                  {l.description && <p className="line-clamp-2 text-sm text-ink-3">{l.description}</p>}
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between text-[11px] text-ink-3">
                    <span>{l.item_count} {l.item_count === 1 ? 'title' : 'titles'}</span>
                    <span>{pct}% read</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ---------------------------------------------- bookmarks */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="display text-lg font-semibold">Quick bookmarks</h2>
          <span className="text-xs text-ink-3">Save now, sort into a list later</span>
        </div>
        {bookmarks.length === 0 ? (
          <Empty icon={<IconBookmark className="size-5" />} title="No bookmarks"
                 body="Bookmark a title from its page and it lands here." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {bookmarks.map((t) => <TitleGridCard key={t.id} t={t} />)}
          </div>
        )}
      </section>
    </div>
  )
}
