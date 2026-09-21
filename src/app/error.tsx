'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="label-eyebrow">Something went wrong</div>
        <h1 className="display mt-2 text-3xl font-semibold">The desk is unavailable</h1>
        <p className="mt-2 text-sm text-ink-2">
          We could not load that page. This is usually the catalogue database being slow to answer — try again.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-ink-3">Reference {error.digest}</p>}
        <button className="btn btn-primary mt-6" onClick={reset}>Try again</button>
      </div>
    </main>
  )
}
