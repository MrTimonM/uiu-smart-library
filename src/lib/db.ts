import postgres from 'postgres'

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined
}

const connection = process.env.DATABASE_URL

if (!connection) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
}

// On Vercel every serverless instance opens its own pool, so a generous `max`
// multiplies into hundreds of connections against Supabase's pooler. Keep it
// small in serverless and let the pooler do the multiplexing.
const serverless = Boolean(process.env.VERCEL)

export const sql =
  global.__sql ??
  postgres(connection, {
    ssl: 'require',
    max: serverless ? 2 : 8,
    idle_timeout: serverless ? 10 : 20,
    connect_timeout: 15,
    prepare: false, // required when going through Supabase's pooler
  })

if (process.env.NODE_ENV !== 'production') global.__sql = sql
