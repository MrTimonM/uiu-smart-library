import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="label-eyebrow">404</div>
        <h1 className="display mt-2 text-3xl font-semibold">Not on the shelf</h1>
        <p className="mt-2 text-sm text-ink-2">
          That page or title is not in the catalogue. It may have been withdrawn, or the link may be wrong.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/search" className="btn btn-primary">Search the catalogue</Link>
          <Link href="/loans" className="btn btn-ghost">Your loans</Link>
        </div>
      </div>
    </main>
  )
}
