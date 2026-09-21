# UIU Smart Library Platform

A discovery and circulation system for the United International University Central Library — one catalogue for print books, e-books, journals and UIU theses, with live copy-level availability, one-step reserving, and recommendations drawn only from titles the library holds.

A Team Ascent web project.

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in your Supabase details
npm run db:push                # create the schema
npm run db:seed                # load the demo catalogue
npm run dev                    # http://localhost:3000
```

`npm run db:reset` drops and recreates everything before applying the schema.

### Environment

```
NEXT_PUBLIC_SUPABASE_URL       your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  publishable key
DATABASE_URL                   Postgres connection string
```

**Connection note.** New Supabase projects publish the direct database host (`db.<ref>.supabase.co`) over IPv6 only. On an IPv4-only machine that hostname will not resolve, so this project connects through the session pooler instead — `postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432`. The pooler region is not always the same as the project region; you can find the exact string under **Project settings → Database → Connection string → Session pooler**. Transaction-mode pooling also requires `prepare: false`, which [src/lib/db.ts](src/lib/db.ts) sets.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, server components), React 19, TypeScript |
| Styling | Tailwind CSS v4, design tokens in [globals.css](src/app/globals.css) |
| API | Node REST route handlers under `src/app/api` |
| Data | Supabase Postgres, full-text search, `pg_trgm` |

---

## Layout

```
src/
  app/
    (app)/            signed-in pages — search, titles, loans, lists, rooms, fines, profile, staff
    api/              REST route handlers
    login/            mock single sign-on
  components/         UI primitives and feature components
  lib/
    db.ts             Postgres client
    session.ts        cookie session + role guards
    queries.ts        all read queries
    circulation.ts    loan, hold, fine, room and rating rules
    recommend.ts      the four-signal ranking
supabase/schema.sql   the full schema
scripts/              migrate, seed, e2e tests
```

---

## What is real and what is simulated

Everything the deck describes is implemented against the live database. Three things stand in for services a student project cannot obtain:

| Area | In this build | In production |
|---|---|---|
| Sign-on | Pick a seeded account; a role switcher sits in the sidebar | UIU single sign-on (same credentials as UCAM). Roles, permissions and loan rules are already enforced exactly as they would be behind SSO |
| Payments | bKash / Rocket / card buttons settle the charge and write a receipt to the ledger | The same call goes to a merchant gateway |
| Notifications | In-app only, in the bell menu | The same rows also dispatched by email and SMS |

Cover art is generated from each title's stored hue rather than fetched from Supabase Storage — the seeded catalogue has no cover images.

---

## Circulation rules

Enforced server-side in [src/lib/circulation.ts](src/lib/circulation.ts) and covered by the test suite:

- **Loan limits** — students 5 items for 14 days, faculty and staff 12 items for 30 days. Reservations count against the limit.
- **Renewals** — twice per item for students, blocked entirely while another reader is queued.
- **Reserving** — if a copy is free it is pulled and held at the desk for 48 hours; otherwise the reader joins a queue and is told their position.
- **Returns** — overdue charges are posted at ৳10 per item per day the moment the item comes back, and the copy is passed to the next reader in the queue rather than reshelved.
- **Blocking** — reserving is refused once a reader owes ৳500 or more.
- **Reference copies** never leave the library; a held copy can only be issued to the reader it is held for.
- **Rooms** — two-hour slots between 09:00 and 21:00, two per reader per day, auto-released if nobody checks in within 15 minutes.

```bash
npm run dev            # or next start
node --env-file=.env.local scripts/test/e2e.mjs
```

The suite drives the real API against the real database and covers 30 rules end to end: reserving, queue promotion, desk issue and return, renewal caps, fine posting, payment settlement, room booking conflicts, ownership checks and authentication.

---

## Recommendations

The four signals and weights come straight from the deck:

| Signal | Weight | Source |
|---|---|---|
| Borrowing history | 42% | Subjects and authors already in the reader's loans |
| Stated interests | 26% | The 16 interest topics on the profile |
| Enrolled courses | 18% | Reserve lists for this semester's enrolments |
| Campus trends | 9% | Most-borrowed over 90 days, plus readers with overlapping history |

The remaining ~5% is acquisition recency and a small quality term. Candidates are restricted to titles the library holds, titles already borrowed or held are excluded, no single reason may fill more than three slots, and every card states why it is being shown. Readers can tilt the mix (*close to my reading* / *balanced* / *surprise me*), switch history or trends off entirely, and clear their history from the profile page.

---

## Demo accounts

Seeded by `npm run db:seed`; sign in by picking one.

| Role | Account | Notes |
|---|---|---|
| Student | Mahedi Hasan Sorol — `11220001` | 5 items out including one overdue, a hold ready for pickup, reading lists, an unpaid fine |
| Faculty | Dr. Salekul Islam | 12-item limit, 30-day loans |
| Staff | Shirin Akter | Circulation desk, hold queue, catalogue admin, reports |
