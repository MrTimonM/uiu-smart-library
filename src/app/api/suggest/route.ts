import { NextResponse } from 'next/server'
import { searchSuggestions } from '@/lib/queries'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (q.trim().length < 2) return NextResponse.json({ results: [] })
  return NextResponse.json({ results: await searchSuggestions(q) })
}
