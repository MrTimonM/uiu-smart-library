import postgres from 'postgres'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false })

const ok = []
const bad = []
function check(name, cond, extra = '') {
  ;(cond ? ok : bad).push(`${name}${extra ? ` — ${extra}` : ''}`)
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
}

async function call(path, method, body, uid) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', cookie: `uiu_lib_uid=${uid}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

// two students with room under the 5-item limit, so the rules under test are
// the ones the test names rather than the borrowing cap
const clean = await sql`
  select u.id, u.uiu_id, u.name from users u
  where u.role = 'student'
    and (select count(*) from loans l where l.user_id=u.id and l.returned_at is null)
      + (select count(*) from holds h where h.user_id=u.id and h.status in ('queued','ready')) = 0
  order by u.uiu_id limit 2`
const [student, other] = clean
if (!student || !other) throw new Error('need two students with no open loans or holds')
const [staff] = await sql`select id from users where role='staff' order by uiu_id limit 1`

// --- pick a title with a free circulating copy that nobody holds
const [t] = await sql`
  select t.id, t.title from titles t
  where t.type='print'
    and exists (select 1 from copies c where c.title_id=t.id and c.status='available' and c.copy_type='circulating')
    and not exists (select 1 from holds h where h.title_id=t.id and h.status in ('queued','ready'))
    and not exists (select 1 from loans l where l.title_id=t.id and l.user_id=${student.id} and l.returned_at is null)
  limit 1`
console.log(`\nfixture: "${t.title}"  student=${student.name}\n`)

/* ---------------------------------------------- 1. reserve pulls a copy */
let r = await call('/api/holds', 'POST', { titleId: t.id }, student.id)
check('reserve a free copy returns ready', r.data.status === 'ready', JSON.stringify(r.data))

const [heldCopy] = await sql`select id, accession_number, status from copies where title_id=${t.id} and status='held'`
check('copy is marked held', Boolean(heldCopy), heldCopy?.accession_number)

const [notif] = await sql`select title from notifications where user_id=${student.id} order by created_at desc limit 1`
check('pickup notification written', notif?.title === 'Ready for pickup', notif?.title)

/* ---------------------------------------------- 2. duplicate reserve blocked */
r = await call('/api/holds', 'POST', { titleId: t.id }, student.id)
check('duplicate reserve rejected', r.status === 400, r.data.error)

/* ---------------------------------------------- 3. wrong reader cannot take it */
r = await call('/api/desk/issue', 'POST', { accession: heldCopy.accession_number, member: other.uiu_id }, staff.id)
check('held copy refused to another reader', r.status === 400, r.data.error)

/* ---------------------------------------------- 4. non-staff cannot use the desk */
r = await call('/api/desk/issue', 'POST', { accession: heldCopy.accession_number, member: student.uiu_id }, student.id)
check('desk endpoint is staff-only', r.status === 403, r.data.error)

/* ---------------------------------------------- 5. issue to the right reader */
r = await call('/api/desk/issue', 'POST', { accession: heldCopy.accession_number, member: student.uiu_id }, staff.id)
check('issue to the holder succeeds', r.status === 200, JSON.stringify(r.data).slice(0, 90))

const [loan] = await sql`select id, due_at, renewals_count from loans where copy_id=${heldCopy.id} and returned_at is null`
check('loan row created', Boolean(loan))
const [holdAfter] = await sql`select status from holds where copy_id=${heldCopy.id} order by placed_at desc limit 1`
check('hold marked collected', holdAfter?.status === 'collected', holdAfter?.status)

/* ---------------------------------------------- 6. renew */
r = await call('/api/loans/renew', 'POST', { loanId: loan.id }, student.id)
check('renew succeeds', r.status === 200, r.data.error ?? `due ${String(r.data.due_at).slice(0, 10)}`)

r = await call('/api/loans/renew', 'POST', { loanId: loan.id }, other.id)
check('another reader cannot renew my loan', r.status === 403, r.data.error)

/* ---------------------------------------------- 7. a queued reader blocks renewal */
await sql`insert into holds (title_id, user_id, status) values (${t.id}, ${other.id}, 'queued')`
r = await call('/api/loans/renew', 'POST', { loanId: loan.id }, student.id)
check('renewal blocked while someone is waiting', r.status === 400, r.data.error)

/* ---------------------------------------------- 8. renewal cap */
await sql`delete from holds where title_id=${t.id} and user_id=${other.id} and status='queued'`
await sql`update loans set renewals_count = 2 where id = ${loan.id}`
r = await call('/api/loans/renew', 'POST', { loanId: loan.id }, student.id)
check('renewal cap enforced', r.status === 400, r.data.error)

/* ---------------------------------------------- 9. overdue return posts a fine */
await sql`update loans set due_at = now() - interval '5 days' where id = ${loan.id}`
const before = Number((await sql`select coalesce(sum(amount),0)::text as s from fines where user_id=${student.id} and status='unpaid'`)[0].s)

// put another reader in the queue so the copy should be promoted, not shelved
await sql`insert into holds (title_id, user_id, status) values (${t.id}, ${other.id}, 'queued')`
r = await call('/api/desk/return', 'POST', { accession: heldCopy.accession_number }, staff.id)
check('return records 5 days late', r.data.daysLate === 5, JSON.stringify(r.data))
check('fine is 5 x 10 taka', r.data.fine === 50, String(r.data.fine))
check('copy passed to next in queue', r.data.promoted === true)

const after = Number((await sql`select coalesce(sum(amount),0)::text as s from fines where user_id=${student.id} and status='unpaid'`)[0].s)
check('fine added to the account', after - before === 50, `${before} -> ${after}`)

const [copyNow] = await sql`select status from copies where id=${heldCopy.id}`
check('copy is held for the next reader', copyNow.status === 'held', copyNow.status)

const [ledgerRow] = await sql`select type, amount from ledger_entries where user_id=${student.id} order by created_at desc limit 1`
check('ledger charge written', ledgerRow?.type === 'charge' && Number(ledgerRow.amount) === 50)

/* ---------------------------------------------- 10. payment clears everything */
r = await call('/api/payments', 'POST', { method: 'bkash' }, student.id)
check('payment succeeds', r.status === 200, `${r.data.reference} for ${r.data.total}`)
const [{ s: outstanding }] = await sql`select coalesce(sum(amount),0)::text as s from fines where user_id=${student.id} and status='unpaid'`
check('nothing outstanding after payment', Number(outstanding) === 0, outstanding)

/* ---------------------------------------------- 11. room booking rules */
const [room] = await sql`select id from rooms order by name limit 1`
const slot = new Date(); slot.setDate(slot.getDate() + 2); slot.setHours(11, 0, 0, 0)
await sql`delete from room_bookings where room_id=${room.id} and slot_start=${slot}`
r = await call('/api/rooms/bookings', 'POST', { roomId: room.id, slotStart: slot.toISOString() }, student.id)
check('book a free slot', r.status === 200, r.data.error)
const bookingId = r.data.id
r = await call('/api/rooms/bookings', 'POST', { roomId: room.id, slotStart: slot.toISOString() }, other.id)
check('double booking rejected', r.status === 400, r.data.error)
r = await call('/api/rooms/bookings', 'PATCH', { bookingId }, student.id)
check('check-in refused outside the window', r.status === 400, r.data.error)
r = await call('/api/rooms/bookings', 'DELETE', { bookingId }, other.id)
check('another reader cannot cancel my booking', r.status === 403, r.data.error)
await call('/api/rooms/bookings', 'DELETE', { bookingId }, student.id)

const badSlot = new Date(); badSlot.setDate(badSlot.getDate() + 2); badSlot.setHours(23, 0, 0, 0)
r = await call('/api/rooms/bookings', 'POST', { roomId: room.id, slotStart: badSlot.toISOString() }, student.id)
check('out-of-hours slot refused', r.status === 400, r.data.error)

/* ---------------------------------------------- 12. reference copies never leave */
const [ref] = await sql`select accession_number from copies where copy_type='reference' and status='available' limit 1`
if (ref) {
  r = await call('/api/desk/issue', 'POST', { accession: ref.accession_number, member: student.uiu_id }, staff.id)
  check('reference copy cannot be issued', r.status === 400, r.data.error)
}

/* ---------------------------------------------- 13. auth */
const anon = await fetch(`${BASE}/api/holds`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ titleId: t.id }),
})
check('unauthenticated request rejected', anon.status === 401)

/* ---------------------------------------------- 14. ratings */
r = await call('/api/ratings', 'POST', { titleId: t.id, stars: 5, review: 'e2e check' }, student.id)
check('rating saved', r.status === 200, r.data.error)
r = await call('/api/ratings', 'POST', { titleId: t.id, stars: 9 }, student.id)
check('out-of-range rating rejected', r.status === 400, r.data.error)

/* ---------------------------------------------- cleanup */
await sql`delete from ratings where user_id=${student.id} and review='e2e check'`
await sql`delete from holds where title_id=${t.id} and user_id=${other.id}`
await sql`update copies set status='available', due_back=null where id=${heldCopy.id}`

console.log(`\n${ok.length} passed, ${bad.length} failed`)
if (bad.length) console.log('FAILURES:\n' + bad.map((b) => '  - ' + b).join('\n'))
await sql.end()
process.exit(bad.length ? 1 : 0)
