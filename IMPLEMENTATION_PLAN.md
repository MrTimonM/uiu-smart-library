# UIU Smart Library Platform — Implementation Plan

Derived from `UIU Smart Library Platform.pptx` (Team Ascent — Mahedi Hasan Sorol, Mostafizur Rahman Murad, Md Minhazul Hoque, Rafsan Hossen Basunia).

---

## 1. Product summary

A single discovery + circulation system for the UIU Central Library covering print books, e-books, journals and UIU theses.

**Scale targets from the deck:** 42,180 titles · 61,904 copies · 4,880 students.

**Core promise:** live copy-level availability, one-step reserving, and recommendations drawn only from titles the library actually holds.

**Roles:**

| Role | Capabilities | Loan policy |
|---|---|---|
| Student | Search, borrow, renew, reserve, book study rooms, fines, recommendations | 5 items / 14 days |
| Faculty | Everything a student can do + course reserves | Longer loan period |
| Library staff | Issue/return at desk, catalogue admin, hold queues, reports | — |

---

## 2. Technology stack (as specified in the deck)

- **Frontend:** Next.js (App Router, React server components), TypeScript, Tailwind CSS
- **API:** Node.js REST route handlers (search ranking, circulation rules, hold queues, recommendation engine)
- **Data:** Supabase — Postgres catalogue, Supabase Auth (UIU SSO), Row Level Security, Storage for cover art
- **Design:** Figma prototype → design tokens → Tailwind theme

**Request flow:** Student searches → Next.js server component calls the Node API → API queries Postgres for copies and availability → ranked results return with live shelf status → reserve writes a hold row and notifies the desk.

**Recommended repo shape (single Next.js app, API as route handlers):**

```
/app
  /(public)          landing, login
  /(student)         search, book/[id], loans, lists, rooms, fines, profile
  /(staff)           desk, catalogue, holds, reports
  /api/...           REST route handlers
/lib                 db client, auth, policy engine, ranking
/components          UI primitives + feature components
/supabase            migrations, seed, RLS policies
/types               generated DB types
```

---

## 3. Data model (Postgres)

**Identity & org**
- `users` (id, uiu_id, name, email, role: student|faculty|staff, department, active)
- `courses` (id, code, title, semester)
- `enrollments` (user_id, course_id)

**Catalogue**
- `titles` (id, type: print|ebook|journal|thesis, title, subtitle, isbn/issn, publisher, year, language, edition, summary, cover_path)
- `authors`, `title_authors` (many-to-many)
- `subjects`, `title_subjects`
- `copies` (id, title_id, accession_number, location_zone, shelf_bay, copy_type: circulating|reference|reserve, status: available|on_loan|held|lost|repair, due_back)
- `digital_assets` (title_id, storage_path, format, access_rule) — for e-books and theses

**Circulation**
- `loans` (id, copy_id, user_id, issued_at, due_at, returned_at, renewals_count, issued_by)
- `holds` (id, title_id, copy_id?, user_id, placed_at, queue_position, status: queued|ready|collected|expired, ready_at, expires_at)
- `loan_rules` (role, max_items, loan_days, max_renewals)

**Fines**
- `fines` (id, user_id, loan_id, amount, reason, posted_at, status)
- `payments` (id, user_id, amount, method: bkash|nagad|card, reference, paid_at)
- `ledger_entries` (user_id, type: charge|payment|waiver, amount, balance_after, created_at)

**Discovery & personalisation**
- `ratings` (user_id, title_id, stars, review, created_at)
- `borrow_history` (user_id, title_id, returned_at) — clearable by the user
- `interests` (16 fixed topics) + `user_interests` (weight)
- `reco_settings` (user_id, mode: balanced|close|surprise, use_history, use_trends)
- `reading_lists` (id, owner_id, name, visibility: private|link|course), `reading_list_items` (list_id, title_id, read_at)
- `saved_searches` (user_id, label, query_json)

**Facilities**
- `rooms` (id, name, capacity, floor)
- `room_bookings` (room_id, user_id, slot_start, slot_end, checked_in_at, status)
- `occupancy_readings` (zone, seats_total, seats_taken, recorded_at)

**Messaging**
- `notifications` (user_id, type, payload, channel: app|email|sms, sent_at, read_at)

**Indexes:** GIN full-text index on `titles` (title + subtitle + authors + subjects); btree on `copies(title_id, status)`, `loans(user_id, returned_at)`, `holds(title_id, queue_position)`.

**RLS:** students read the catalogue freely, but read/write only their own loans, holds, fines, lists, bookings and history. Staff get a bypass policy. All circulation writes go through the API with explicit checks, never straight from the browser.

---

## 4. Feature breakdown and build order

### Phase 0 — Foundations
1. Next.js + TypeScript + Tailwind scaffold; design tokens from the Figma prototype.
2. Supabase project, migrations directory, generated types.
3. Auth: Supabase Auth wired to UIU SSO (same credentials as UCAM); role claim in JWT; middleware guarding the `(student)` and `(staff)` route groups.
4. Seed script: ~1,000 sample titles with multiple copies each, sample users of all three roles.

### Phase 1 — Catalogue and search (slide 6)
- Unified search across print, e-books, journals and theses in one query.
- Facets: format, availability, subject, location, language, year.
- Ranking: Postgres `ts_rank` plus a boost for available copies and recent acquisitions.
- Live shelf status on every result row (copies free / total).
- Saved searches for course reserve lists.

### Phase 2 — Book detail and reserving (slide 7)
- Copy table: accession number, shelf, copy type, due-back date.
- Shelf map highlighting the exact bay (SVG floor plan per zone).
- One-step reserve creating a hold, held 48 hours at the desk; digital titles open instantly.
- Ratings distribution and reviews.
- Citation export: APA 7 and BibTeX, copy to clipboard.

### Phase 3 — Loans, holds and renewals (slide 8)
- 14-day timeline: due dates, overdue items, hold expiry.
- Renew in place — twice per item, blocked when another reader is queued.
- Hold queue position and estimated ready date.
- Pickup reminders when a reserved copy reaches the desk.
- Borrowing history, clearable at any time.

### Phase 4 — Staff back office
- Circulation desk: issue by accession number, accept returns, auto-post fines on overdue return.
- Catalogue admin: CRUD on titles, copies, digital assets; cover upload to Storage.
- Hold queue actions: mark ready, mark collected, expire.
- Reports: loans per month, overdue list, most-borrowed titles, fine collection.

### Phase 5 — Recommendations (slide 9)

| Signal | Weight |
|---|---|
| Borrowing history | 42% |
| Stated interests | 26% |
| Enrolled courses | 18% |
| Campus trends | 9% |

The remaining ~5% is reserved for recency and diversity jitter.

- Candidate set restricted to titles the library holds.
- Grouped by reason: "Because you borrowed…", trending, similar readers.
- Every card shows its explanation.
- Mix control: balanced / close to my reading / surprise me.
- Ratings on returned books feed straight back into ranking.
- Implementation: a nightly job writes per-user candidate scores into a `recommendations` table; the API reads and cheaply re-ranks at request time.

### Phase 6 — Reading lists and bookmarks (slide 10)
- User-created lists: course reading, thesis sources, holiday picks.
- Import a course outline to pull the reserve list for an enrolled course.
- Share by link, private by default.
- Progress tracking per list.
- Quick bookmark into an unsorted bucket.

### Phase 7 — Study rooms and occupancy (slide 11)
- Six bookable spaces, two-hour slots between 09:00 and 21:00.
- Live seat count per zone (e.g. 68 of 120 in the reading hall).
- Floor plan showing zones, stacks and free rooms.
- Busiest-hour chart around the 17:00–19:00 peak.
- Auto-release when nobody checks in within 15 minutes.

### Phase 8 — Fines, payments and notifications (slide 12)
- ৳10 per item per day, posted the moment it accrues; full ledger of charges, payments and waivers.
- Payment by bKash, Nagad or card; clearance status for semester sign-off.
- Alerts: due-date reminder three days ahead, pickup alerts, new-arrival notices — app, email or SMS.

### Phase 9 — Profile and privacy (slide 13)
- 16 interest topics with weighting.
- Recommendation switches: turn history or campus trends off entirely.
- Clear history; nothing shared with other readers.
- Course sync so reserves follow enrolment.

### Roadmap (post-launch, from the deck)
Mobile app with barcode scanning · offline e-book reader · inter-library loans with other Dhaka universities.

---

## 5. API surface (indicative)

```
GET    /api/search?q=&format=&available=&subject=&year=&lang=&page=
GET    /api/titles/:id
POST   /api/holds                 { titleId }
DELETE /api/holds/:id
GET    /api/loans/me
POST   /api/loans/:id/renew
GET    /api/recommendations?mode=
POST   /api/ratings               { titleId, stars, review }
GET    /api/lists , POST /api/lists/:id/items
GET    /api/rooms/availability?date=
POST   /api/rooms/bookings
GET    /api/occupancy
GET    /api/fines/me , POST /api/payments
GET    /api/profile/preferences , PUT /api/profile/preferences

Staff:
POST   /api/desk/issue            { accession, userId }
POST   /api/desk/return           { accession }
CRUD   /api/admin/titles , /api/admin/copies
GET    /api/admin/reports/:name
```

---

## 6. Scheduled jobs

| Job | Cadence | Purpose |
|---|---|---|
| Overdue sweep | hourly | post ৳10/day fines, flag overdue |
| Due-date reminders | daily | notify three days before due |
| Hold expiry | hourly | expire uncollected holds after 48h, promote next in queue |
| Room auto-release | every 5 min | free slots with no check-in after 15 min |
| Recommendation rebuild | nightly | recompute per-user candidate scores |
| Trending refresh | daily | campus trend signal |

---

## 7. Work split (matching the deck's presenter split)

- **Member 1** — architecture, database schema, migrations, RLS, auth/SSO
- **Member 2** — search, filters, book detail, reserving, shelf map, citations
- **Member 3** — loans/holds/renewals, recommendation engine, reading lists
- **Member 4** — study rooms and occupancy, fines/payments, notifications, profile and privacy, staff reports

Shared: design system, component library, seed data, testing.

---

## 8. Milestones

| Week | Deliverable |
|---|---|
| 1 | Scaffold, schema, auth, seed data |
| 2 | Search, filters, results with live availability |
| 3 | Book detail, copies, reserving, holds |
| 4 | Loans, renewals, staff desk (issue/return) |
| 5 | Recommendations, reading lists |
| 6 | Study rooms, occupancy, fines and payments |
| 7 | Notifications, profile/privacy, staff reports |
| 8 | Polish, accessibility pass, demo seed data, presentation build |

---

## 9. Definition of done per feature

- Works for all three roles with correct permission boundaries, verified against RLS.
- Loading, empty and error states designed — not defaults.
- Mobile layout works at 360px width.
- Seeded demo data makes the screen look realistic for the presentation.
