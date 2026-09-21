import 'server-only'
import { sql } from './db'
import { CLOSE_HOUR, LIBRARY_TZ, OPEN_HOUR, SLOT_HOURS, libraryDate, libraryHour } from './time'

export class RuleError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

const FINE_PER_DAY = 10 // ৳10 per item per day, per the project brief

async function notify(userId: string, type: string, title: string, body: string, href?: string) {
  await sql`insert into notifications (user_id, type, title, body, href)
            values (${userId}, ${type}, ${title}, ${body}, ${href ?? null})`
}

async function rulesFor(userId: string) {
  const [row] = await sql<{ role: string; max_items: number; loan_days: number; max_renewals: number }[]>`
    select u.role::text, r.max_items, r.loan_days, r.max_renewals
    from users u join loan_rules r on r.role = u.role where u.id = ${userId}`
  if (!row) throw new RuleError('Member not found', 404)
  return row
}

/* ============================================================ holds */

export async function placeHold(userId: string, titleId: string) {
  const [title] = await sql<{ id: string; title: string; type: string }[]>`
    select id, title, type::text from titles where id = ${titleId}`
  if (!title) throw new RuleError('Title not found', 404)
  if (title.type === 'ebook') throw new RuleError('E-books do not need reserving — open it directly.')

  const [existing] = await sql`
    select 1 from holds where user_id = ${userId} and title_id = ${titleId} and status in ('queued','ready')`
  if (existing) throw new RuleError('You already have a reservation on this title.')

  const [onLoan] = await sql`
    select 1 from loans where user_id = ${userId} and title_id = ${titleId} and returned_at is null`
  if (onLoan) throw new RuleError('You already have this title on loan.')

  const rules = await rulesFor(userId)
  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count from loans where user_id = ${userId} and returned_at is null`
  const [{ held }] = await sql<{ held: string }[]>`
    select count(*)::text as held from holds where user_id = ${userId} and status in ('queued','ready')`
  if (Number(count) + Number(held) >= rules.max_items) {
    throw new RuleError(`Your limit is ${rules.max_items} items at a time, including reservations.`)
  }

  const [{ outstanding }] = await sql<{ outstanding: string }[]>`
    select coalesce(sum(amount),0)::text as outstanding from fines where user_id = ${userId} and status = 'unpaid'`
  if (Number(outstanding) >= 500) {
    throw new RuleError('Clear your outstanding fines before reserving another item.')
  }

  // If a copy is free, hold it immediately (48 hours at the desk).
  const [free] = await sql<{ id: string }[]>`
    select id from copies
    where title_id = ${titleId} and status = 'available' and copy_type <> 'reference'
    order by copy_type limit 1 for update skip locked`

  if (free) {
    const [hold] = await sql<{ id: string }[]>`
      insert into holds (title_id, copy_id, user_id, status, ready_at, expires_at)
      values (${titleId}, ${free.id}, ${userId}, 'ready', now(), now() + interval '48 hours')
      returning id`
    await sql`update copies set status = 'held' where id = ${free.id}`
    await notify(userId, 'hold_ready', 'Ready for pickup',
      `“${title.title}” is waiting at the circulation desk. Collect it within 48 hours.`, '/loans')
    return { status: 'ready' as const, holdId: hold!.id, position: 0 }
  }

  const [hold] = await sql<{ id: string }[]>`
    insert into holds (title_id, user_id, status) values (${titleId}, ${userId}, 'queued') returning id`
  const [{ position }] = await sql<{ position: string }[]>`
    select count(*)::text as position from holds
    where title_id = ${titleId} and status = 'queued' and placed_at <= (select placed_at from holds where id = ${hold!.id})`
  await notify(userId, 'hold_queued', 'Added to the queue',
    `You are number ${position} in the queue for “${title.title}”. We will tell you when a copy is ready.`, '/loans')
  return { status: 'queued' as const, holdId: hold!.id, position: Number(position) }
}

export async function cancelHold(userId: string, holdId: string) {
  const [hold] = await sql<{ id: string; copy_id: string | null; user_id: string }[]>`
    select id, copy_id, user_id from holds where id = ${holdId}`
  if (!hold) throw new RuleError('Reservation not found', 404)
  if (hold.user_id !== userId) throw new RuleError('That reservation is not yours', 403)
  await sql`update holds set status = 'cancelled' where id = ${holdId}`
  if (hold.copy_id) await sql`update copies set status = 'available' where id = ${hold.copy_id}`
  return { ok: true }
}

/* ============================================================ renewals */

export async function renewLoan(userId: string, loanId: string) {
  const [loan] = await sql<{ id: string; user_id: string; title_id: string; due_at: string; renewals_count: number; title: string }[]>`
    select l.id, l.user_id, l.title_id, l.due_at, l.renewals_count, t.title
    from loans l join titles t on t.id = l.title_id
    where l.id = ${loanId} and l.returned_at is null`
  if (!loan) throw new RuleError('Loan not found', 404)
  if (loan.user_id !== userId) throw new RuleError('That loan is not yours', 403)

  const rules = await rulesFor(userId)
  if (loan.renewals_count >= rules.max_renewals) {
    throw new RuleError(`This item has already been renewed ${rules.max_renewals} times.`)
  }

  const [{ waiting }] = await sql<{ waiting: string }[]>`
    select count(*)::text as waiting from holds where title_id = ${loan.title_id} and status = 'queued'`
  if (Number(waiting) > 0) {
    throw new RuleError(`Another reader is waiting for this title, so it cannot be renewed.`)
  }

  const base = new Date(loan.due_at) > new Date() ? new Date(loan.due_at) : new Date()
  const due = new Date(base.getTime() + rules.loan_days * 86400000)
  await sql`update loans set due_at = ${due}, renewals_count = renewals_count + 1 where id = ${loanId}`
  await sql`update copies set due_back = ${due} where id = (select copy_id from loans where id = ${loanId})`
  await notify(userId, 'renewed', 'Loan renewed',
    `“${loan.title}” is now due back on ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`, '/loans')
  return { due_at: due, renewals_count: loan.renewals_count + 1 }
}

/* ============================================================ desk */

export async function issueCopy(staffId: string, accession: string, memberCode: string) {
  const [copy] = await sql<{ id: string; title_id: string; status: string; copy_type: string; title: string }[]>`
    select c.id, c.title_id, c.status::text, c.copy_type::text, t.title
    from copies c join titles t on t.id = c.title_id where c.accession_number = ${accession}`
  if (!copy) throw new RuleError(`No copy with accession number ${accession}`, 404)
  if (copy.copy_type === 'reference') throw new RuleError('Reference copies cannot leave the library.')
  if (copy.status === 'on_loan') throw new RuleError('That copy is already on loan.')
  if (copy.status === 'lost' || copy.status === 'repair') throw new RuleError(`That copy is marked ${copy.status}.`)

  const [member] = await sql<{ id: string; name: string; role: string }[]>`
    select id, name, role::text from users where uiu_id = ${memberCode} or email = ${memberCode}`
  if (!member) throw new RuleError(`No member with ID ${memberCode}`, 404)

  const rules = await rulesFor(member.id)
  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count from loans where user_id = ${member.id} and returned_at is null`
  if (Number(count) >= rules.max_items) {
    throw new RuleError(`${member.name} already has ${count} items out (limit ${rules.max_items}).`)
  }

  // A held copy may only be issued to the reader it is being held for.
  if (copy.status === 'held') {
    const [hold] = await sql<{ user_id: string }[]>`
      select user_id from holds where copy_id = ${copy.id} and status = 'ready'`
    if (hold && hold.user_id !== member.id) {
      throw new RuleError('That copy is being held for another reader.')
    }
    if (hold) await sql`update holds set status = 'collected' where copy_id = ${copy.id} and status = 'ready'`
  }

  const due = new Date(Date.now() + rules.loan_days * 86400000)
  const [loan] = await sql<{ id: string }[]>`
    insert into loans (copy_id, title_id, user_id, due_at, issued_by)
    values (${copy.id}, ${copy.title_id}, ${member.id}, ${due}, ${staffId}) returning id`
  await sql`update copies set status = 'on_loan', due_back = ${due} where id = ${copy.id}`
  await notify(member.id, 'issued', 'Item issued',
    `“${copy.title}” is due back on ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`, '/loans')
  return { loanId: loan!.id, member: member.name, title: copy.title, due_at: due }
}

export async function returnCopy(accession: string) {
  const [copy] = await sql<{ id: string; title_id: string; title: string }[]>`
    select c.id, c.title_id, t.title from copies c join titles t on t.id = c.title_id
    where c.accession_number = ${accession}`
  if (!copy) throw new RuleError(`No copy with accession number ${accession}`, 404)

  const [loan] = await sql<{ id: string; user_id: string; due_at: string }[]>`
    select id, user_id, due_at from loans where copy_id = ${copy.id} and returned_at is null`
  if (!loan) throw new RuleError('That copy is not currently on loan.')

  await sql`update loans set returned_at = now() where id = ${loan.id}`

  // Overdue charge, posted the moment the item comes back.
  const daysLate = Math.floor((Date.now() - new Date(loan.due_at).getTime()) / 86400000)
  let fine = 0
  if (daysLate > 0) {
    fine = daysLate * FINE_PER_DAY
    await sql`insert into fines (user_id, loan_id, title_id, amount, days_late, reason)
              values (${loan.user_id}, ${loan.id}, ${copy.title_id}, ${fine}, ${daysLate}, 'Overdue return')`
    await addLedger(loan.user_id, 'charge', fine, `Overdue — ${copy.title} (${daysLate} day${daysLate > 1 ? 's' : ''})`)
    await notify(loan.user_id, 'fine', 'Overdue charge posted',
      `“${copy.title}” came back ${daysLate} day${daysLate > 1 ? 's' : ''} late. ৳${fine} has been added to your account.`, '/fines')
  }

  // Promote the next reader in the queue onto this copy.
  const [next] = await sql<{ id: string; user_id: string }[]>`
    select id, user_id from holds where title_id = ${copy.title_id} and status = 'queued'
    order by placed_at limit 1`
  if (next) {
    await sql`update holds set status='ready', copy_id=${copy.id}, ready_at=now(),
              expires_at = now() + interval '48 hours' where id = ${next.id}`
    await sql`update copies set status='held', due_back=null where id = ${copy.id}`
    await notify(next.user_id, 'hold_ready', 'Ready for pickup',
      `“${copy.title}” is now waiting at the circulation desk. Collect it within 48 hours.`, '/loans')
  } else {
    await sql`update copies set status='available', due_back=null where id = ${copy.id}`
  }

  return { title: copy.title, daysLate: Math.max(0, daysLate), fine, promoted: Boolean(next) }
}

/* ============================================================ fines */

export async function addLedger(userId: string, type: 'charge' | 'payment' | 'waiver', amount: number, description: string) {
  const [{ balance }] = await sql<{ balance: string }[]>`
    select coalesce((select balance_after from ledger_entries where user_id = ${userId}
                     order by created_at desc limit 1), 0)::text as balance`
  const next = type === 'charge' ? Number(balance) + amount : Number(balance) - amount
  await sql`insert into ledger_entries (user_id, type, amount, description, balance_after)
            values (${userId}, ${type}::ledger_type, ${amount}, ${description}, ${next})`
}

/**
 * Simulated payment. No merchant gateway is wired up, so the member presses
 * Pay and the charge settles. 'nagad' stays in the enum for records already
 * written against it.
 */
export const PAY_LABEL: Record<string, string> = {
  bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad', card: 'Card',
}

export async function payFines(userId: string, method: 'bkash' | 'rocket' | 'card') {
  const unpaid = await sql<{ id: string; amount: string }[]>`
    select id, amount from fines where user_id = ${userId} and status = 'unpaid'`
  if (unpaid.length === 0) throw new RuleError('There is nothing outstanding to pay.')

  const total = unpaid.reduce((s, f) => s + Number(f.amount), 0)
  const reference = `${method.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`

  await sql`update fines set status = 'paid' where user_id = ${userId} and status = 'unpaid'`
  await sql`insert into payments (user_id, amount, method, reference)
            values (${userId}, ${total}, ${method}::pay_method, ${reference})`
  await addLedger(userId, 'payment', total, `${PAY_LABEL[method] ?? method} payment ${reference}`)
  await notify(userId, 'payment', 'Payment received',
    `৳${total} settled by ${PAY_LABEL[method] ?? method}. Reference ${reference}.`, '/fines')
  return { total, reference, cleared: unpaid.length }
}

/* ============================================================ rooms */

export async function bookRoom(userId: string, roomId: string, slotStart: string) {
  const start = new Date(slotStart)
  if (Number.isNaN(start.getTime())) throw new RuleError('Invalid slot')
  const end = new Date(start.getTime() + SLOT_HOURS * 3600000)

  // Opening hours are Dhaka wall-clock, not the server's timezone.
  const hour = libraryHour(start)
  if (hour < OPEN_HOUR || hour >= CLOSE_HOUR) {
    throw new RuleError(`Rooms are bookable between ${String(OPEN_HOUR).padStart(2, '0')}:00 and ${CLOSE_HOUR}:00.`)
  }
  if (end.getTime() < Date.now()) throw new RuleError('That slot has already passed.')

  const [clash] = await sql`
    select 1 from room_bookings
    where room_id = ${roomId} and status in ('booked','checked_in')
      and slot_start < ${end} and slot_end > ${start}`
  if (clash) throw new RuleError('That slot has just been taken.')

  const [mine] = await sql`
    select 1 from room_bookings where user_id = ${userId} and status in ('booked','checked_in')
      and slot_start < ${end} and slot_end > ${start}`
  if (mine) throw new RuleError('You already have a room booked for that time.')

  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count from room_bookings
    where user_id = ${userId} and status = 'booked'
      and (slot_start at time zone ${LIBRARY_TZ})::date = ${libraryDate(start)}::date`
  if (Number(count) >= 2) throw new RuleError('Two slots per day is the limit.')

  const [room] = await sql<{ name: string }[]>`select name from rooms where id = ${roomId}`
  const [booking] = await sql<{ id: string }[]>`
    insert into room_bookings (room_id, user_id, slot_start, slot_end)
    values (${roomId}, ${userId}, ${start}, ${end}) returning id`
  await notify(userId, 'room', 'Room booked',
    `${room?.name} is reserved for you on ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: LIBRARY_TZ })} at ${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: LIBRARY_TZ })}. Check in within 15 minutes or the slot is released.`, '/rooms')
  return { id: booking!.id }
}

export async function cancelBooking(userId: string, bookingId: string) {
  const [b] = await sql<{ user_id: string }[]>`select user_id from room_bookings where id = ${bookingId}`
  if (!b) throw new RuleError('Booking not found', 404)
  if (b.user_id !== userId) throw new RuleError('That booking is not yours', 403)
  await sql`update room_bookings set status='cancelled' where id = ${bookingId}`
  return { ok: true }
}

export async function checkInBooking(userId: string, bookingId: string) {
  const [b] = await sql<{ user_id: string; slot_start: string; status: string }[]>`
    select user_id, slot_start, status::text from room_bookings where id = ${bookingId}`
  if (!b) throw new RuleError('Booking not found', 404)
  if (b.user_id !== userId) throw new RuleError('That booking is not yours', 403)
  if (b.status === 'checked_in') throw new RuleError('Already checked in.')
  const mins = (Date.now() - new Date(b.slot_start).getTime()) / 60000
  if (mins < -10) throw new RuleError('You can check in from 10 minutes before the slot starts.')
  if (mins > 15) throw new RuleError('Check-in closed — the slot was auto-released after 15 minutes.')
  await sql`update room_bookings set status='checked_in', checked_in_at=now() where id = ${bookingId}`
  return { ok: true }
}

/**
 * Auto-release: any slot whose reader did not check in within 15 minutes goes
 * back into the pool. Runs opportunistically whenever the rooms page loads,
 * which stands in for the scheduled job described in the plan.
 */
export async function releaseStaleBookings() {
  const released = await sql<{ id: string; user_id: string }[]>`
    update room_bookings set status = 'released'
    where status = 'booked' and checked_in_at is null and slot_start < now() - interval '15 minutes'
    returning id, user_id`
  return released.length
}

/* ============================================================ ratings */

export async function rateTitle(userId: string, titleId: string, stars: number, review: string | null) {
  if (stars < 1 || stars > 5) throw new RuleError('Rating must be between 1 and 5 stars.')
  await sql`
    insert into ratings (user_id, title_id, stars, review) values (${userId}, ${titleId}, ${stars}, ${review})
    on conflict (user_id, title_id) do update set stars = excluded.stars, review = excluded.review, created_at = now()`
  await sql`
    update titles t set rating_avg = r.avg, rating_count = r.n
    from (select round(avg(stars)::numeric,2) avg, count(*) n from ratings where title_id = ${titleId}) r
    where t.id = ${titleId}`
  return { ok: true }
}
