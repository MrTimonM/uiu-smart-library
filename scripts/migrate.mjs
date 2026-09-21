import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false })

const TABLES = [
  'notifications', 'occupancy_readings', 'room_bookings', 'rooms',
  'course_reserves', 'saved_searches', 'bookmarks', 'reading_list_items',
  'reading_lists', 'reco_settings', 'user_interests', 'interests', 'ratings',
  'ledger_entries', 'payments', 'fines', 'holds', 'loans', 'loan_rules',
  'digital_assets', 'copies', 'title_subjects', 'subjects', 'title_authors',
  'authors', 'titles', 'enrollments', 'courses', 'users',
]
const TYPES = [
  'user_role', 'title_type', 'copy_type', 'copy_status', 'hold_status',
  'fine_status', 'ledger_type', 'pay_method', 'list_visibility',
  'booking_status', 'reco_mode',
]

try {
  await sql.unsafe('create extension if not exists pg_trgm')
  await sql.unsafe('create extension if not exists pgcrypto')

  if (process.argv.includes('--reset')) {
    console.log('resetting…')
    await sql.unsafe('drop view if exists title_availability cascade')
    for (const t of TABLES) await sql.unsafe(`drop table if exists ${t} cascade`)
    for (const t of TYPES) await sql.unsafe(`drop type if exists ${t} cascade`)
  }

  const schema = readFileSync(join(root, 'supabase', 'schema.sql'), 'utf8')
  await sql.unsafe(schema)
  console.log('schema applied')
} catch (err) {
  console.error('migration failed:', err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
