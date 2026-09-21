import { sql } from '@/lib/db'
import { route } from '@/lib/api'
import { RuleError } from '@/lib/circulation'

/** Add a copy to an existing title. */
export const POST = route<{ titleId: string; zone?: string; bay?: string; copyType?: string }>(
  async ({ body }) => {
    const [{ next }] = await sql<{ next: string }[]>`
      select coalesce(max(substring(accession_number from 5)::int), 100000) + 1 as next from copies`
    const [row] = await sql<{ accession_number: string }[]>`
      insert into copies (title_id, accession_number, location_zone, shelf_bay, copy_type)
      values (${body.titleId}, ${`UIU-${next}`},
              ${body.zone || 'First Floor — Stacks A'}, ${body.bay || 'A-1'},
              ${body.copyType || 'circulating'}::copy_type)
      returning accession_number`
    return { accession: row!.accession_number }
  }, { staff: true })

export const PATCH = route<{ copyId: string; status: string }>(async ({ body }) => {
  if (!['available', 'lost', 'repair'].includes(body.status)) {
    throw new RuleError('Set a copy to available, lost or repair.')
  }
  const [onLoan] = await sql`select 1 from loans where copy_id = ${body.copyId} and returned_at is null`
  if (onLoan) throw new RuleError('That copy is on loan — accept the return first.')
  await sql`update copies set status = ${body.status}::copy_status where id = ${body.copyId}`
  return { ok: true }
}, { staff: true })
