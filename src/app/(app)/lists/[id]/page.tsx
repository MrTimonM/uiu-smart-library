import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getList } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { Availability, BookCover, Empty, SectionHead } from '@/components/ui'
import { DeleteListButton, ItemActions, ShareListButton } from '@/components/list-actions'
import { authorLine, TYPE_SHORT } from '@/lib/format'
import { IconList } from '@/components/icons'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const list = await getList((await params).id)
  return { title: list?.name ?? 'Reading list' }
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const list = await getList(id)
  if (!list) notFound()

  const mine = list.owner_id === user.id
  if (!mine && list.visibility === 'private') notFound()

  const readCount = list.items.filter((i) => i.read_at).length
  const pct = list.items.length ? Math.round((readCount / list.items.length) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/lists" className="hover:text-brand">Reading lists</Link>
        <span>/</span>
        <span className="truncate text-ink-2">{list.name}</span>
      </nav>

      <SectionHead
        eyebrow={list.course_code ? `Course reserve · ${list.course_code}` : mine ? 'Your list' : `Shared by ${list.owner_name}`}
        title={list.name}
        sub={list.description ?? undefined}
        action={mine ? <ShareListButton listId={list.id} slug={list.share_slug} visibility={list.visibility} /> : undefined}
      />

      {list.items.length > 0 && (
        <div className="card mb-5 flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-[160px] flex-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{readCount} of {list.items.length} read</span>
              <span className="text-ink-3">{pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-xs text-ink-3">
            {list.items.filter((i) => i.copies_available > 0 || i.type === 'ebook').length} of {list.items.length} available right now
          </div>
        </div>
      )}

      {list.items.length === 0 ? (
        <Empty
          icon={<IconList className="size-5" />}
          title="This list is empty"
          body="Open a title from the catalogue and use “Add to list”."
          action={<Link href="/search" className="btn btn-primary">Browse the catalogue</Link>}
        />
      ) : (
        <ol className="space-y-3">
          {list.items.map((item, i) => (
            <li key={item.item_id}>
              <article className={`card flex items-center gap-4 p-4 transition ${item.read_at ? 'opacity-65' : ''}`}>
                <span className="w-5 shrink-0 text-center text-sm tabular-nums text-ink-3">{i + 1}</span>
                <Link href={`/titles/${item.id}`}>
                  <BookCover title={item.title} hue={item.cover_hue} type={item.type} />
                </Link>
                <div className="min-w-0 flex-1">
                  <span className="label-eyebrow">{TYPE_SHORT[item.type]}{item.year ? ` · ${item.year}` : ''}</span>
                  <h3 className="truncate font-medium">
                    <Link href={`/titles/${item.id}`} className="hover:text-brand">{item.title}</Link>
                  </h3>
                  <p className="truncate text-sm text-ink-2">{authorLine(item.authors)}</p>
                  <div className="mt-2">
                    <Availability available={item.copies_available} total={item.copies_total} nextDue={item.next_due} type={item.type} />
                  </div>
                </div>
                {mine && <ItemActions itemId={item.item_id} read={Boolean(item.read_at)} />}
              </article>
            </li>
          ))}
        </ol>
      )}

      {mine && (
        <div className="mt-8 flex justify-end border-t border-line pt-5">
          <DeleteListButton listId={list.id} />
        </div>
      )}
    </div>
  )
}
