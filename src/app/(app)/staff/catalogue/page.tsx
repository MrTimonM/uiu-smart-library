import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCatalogueAdmin } from '@/lib/queries'
import { requireUser } from '@/lib/session'
import { BookCover, Empty, SectionHead } from '@/components/ui'
import { NewTitleForm, TitleAdminActions } from '@/components/catalogue-admin'
import { authorLine, formatDate, TYPE_SHORT } from '@/lib/format'
import { IconGrid, IconSearch } from '@/components/icons'

export const metadata = { title: 'Catalogue admin' }

export default async function CatalogueAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser()
  if (user.role !== 'staff') redirect('/search')

  const { q = '' } = await searchParams
  const titles = await getCatalogueAdmin(q)

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHead
        eyebrow="Back office"
        title="Catalogue"
        sub="Add titles and copies, correct records, and take a copy out of circulation. Search indexing is refreshed on every change."
        action={<NewTitleForm />}
      />

      <form className="card mb-5 flex items-center gap-2 p-2" action="/staff/catalogue">
        <IconSearch className="ml-1.5 size-4 shrink-0 text-ink-3" />
        <input name="q" defaultValue={q} placeholder="Find a title to edit" className="input border-0 shadow-none focus:shadow-none" />
        <button className="btn btn-ghost shrink-0">Search</button>
      </form>

      {titles.length === 0 ? (
        <Empty icon={<IconGrid className="size-5" />} title="No titles matched" />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {['Title', 'Format', 'Copies', 'Added', ''].map((h, i) => (
                  <th key={i} className="label-eyebrow px-3.5 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {titles.map((t) => (
                <tr key={t.id} className="border-b border-line-2 last:border-0">
                  <td className="max-w-0 px-3.5 py-2.5">
                    <div className="flex items-center gap-3">
                      <BookCover title={t.title} hue={t.cover_hue} type={t.type} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/titles/${t.id}`} className="block truncate font-medium hover:text-brand">{t.title}</Link>
                        <span className="block truncate text-[11px] text-ink-3">
                          {authorLine(t.authors, 2)}{t.year ? ` · ${t.year}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-2">{TYPE_SHORT[t.type]}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5">
                    <span className="tabular-nums font-medium">{t.copies_available}</span>
                    <span className="text-ink-3"> / {t.copies_total}</span>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-3">{formatDate(t.added_at, { year: undefined })}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    <TitleAdminActions titleId={t.id} title={t.title} copiesTotal={t.copies_total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
