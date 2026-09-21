-- UIU Smart Library Platform — schema
-- Applied by: npm run db:push

create schema if not exists public;

-- ---------------------------------------------------------------- enums
do $$ begin
  create type user_role        as enum ('student','faculty','staff');
  create type title_type       as enum ('print','ebook','journal','thesis');
  create type copy_type        as enum ('circulating','reference','reserve');
  create type copy_status      as enum ('available','on_loan','held','lost','repair');
  create type hold_status      as enum ('queued','ready','collected','expired','cancelled');
  create type fine_status      as enum ('unpaid','paid','waived');
  create type ledger_type      as enum ('charge','payment','waiver');
  create type pay_method       as enum ('bkash','nagad','card');
  create type list_visibility  as enum ('private','link','course');
  create type booking_status   as enum ('booked','checked_in','released','cancelled','completed');
  create type reco_mode        as enum ('balanced','close','surprise');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- identity
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  uiu_id        text unique not null,
  name          text not null,
  email         text unique not null,
  role          user_role not null default 'student',
  department    text,
  avatar_hue    int not null default 210,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists courses (
  id        uuid primary key default gen_random_uuid(),
  code      text unique not null,
  title     text not null,
  semester  text not null,
  dept      text
);

create table if not exists enrollments (
  user_id    uuid references users(id) on delete cascade,
  course_id  uuid references courses(id) on delete cascade,
  primary key (user_id, course_id)
);

-- ---------------------------------------------------------------- catalogue
create table if not exists titles (
  id           uuid primary key default gen_random_uuid(),
  type         title_type not null default 'print',
  title        text not null,
  subtitle     text,
  isbn         text,
  issn         text,
  publisher    text,
  year         int,
  language     text not null default 'English',
  edition      text,
  pages        int,
  summary      text,
  cover_hue    int not null default 210,
  added_at     timestamptz not null default now(),
  rating_avg   numeric(3,2) not null default 0,
  rating_count int not null default 0,
  borrow_count int not null default 0
);

create table if not exists authors (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null
);

create table if not exists title_authors (
  title_id  uuid references titles(id) on delete cascade,
  author_id uuid references authors(id) on delete cascade,
  ord       int not null default 0,
  primary key (title_id, author_id)
);

create table if not exists subjects (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null
);

create table if not exists title_subjects (
  title_id   uuid references titles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  primary key (title_id, subject_id)
);

create table if not exists copies (
  id                uuid primary key default gen_random_uuid(),
  title_id          uuid not null references titles(id) on delete cascade,
  accession_number  text unique not null,
  location_zone     text not null,
  shelf_bay         text not null,
  copy_type         copy_type not null default 'circulating',
  status            copy_status not null default 'available',
  due_back          date
);

create table if not exists digital_assets (
  id          uuid primary key default gen_random_uuid(),
  title_id    uuid not null references titles(id) on delete cascade,
  format      text not null default 'pdf',
  url         text,
  access_rule text not null default 'campus'
);

-- ---------------------------------------------------------------- circulation
create table if not exists loan_rules (
  role          user_role primary key,
  max_items     int not null,
  loan_days     int not null,
  max_renewals  int not null
);

create table if not exists loans (
  id             uuid primary key default gen_random_uuid(),
  copy_id        uuid not null references copies(id),
  title_id       uuid not null references titles(id),
  user_id        uuid not null references users(id) on delete cascade,
  issued_at      timestamptz not null default now(),
  due_at         timestamptz not null,
  returned_at    timestamptz,
  renewals_count int not null default 0,
  issued_by      uuid references users(id)
);

create table if not exists holds (
  id        uuid primary key default gen_random_uuid(),
  title_id  uuid not null references titles(id) on delete cascade,
  copy_id   uuid references copies(id),
  user_id   uuid not null references users(id) on delete cascade,
  placed_at timestamptz not null default now(),
  status    hold_status not null default 'queued',
  ready_at  timestamptz,
  expires_at timestamptz
);

-- ---------------------------------------------------------------- fines
create table if not exists fines (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users(id) on delete cascade,
  loan_id   uuid references loans(id) on delete set null,
  title_id  uuid references titles(id),
  amount    numeric(10,2) not null,
  days_late int not null default 0,
  reason    text not null default 'Overdue return',
  posted_at timestamptz not null default now(),
  status    fine_status not null default 'unpaid'
);

create table if not exists payments (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users(id) on delete cascade,
  amount    numeric(10,2) not null,
  method    pay_method not null,
  reference text not null,
  paid_at   timestamptz not null default now()
);

create table if not exists ledger_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  type          ledger_type not null,
  amount        numeric(10,2) not null,
  description   text not null,
  balance_after numeric(10,2) not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- discovery
create table if not exists ratings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  title_id   uuid not null references titles(id) on delete cascade,
  stars      int not null check (stars between 1 and 5),
  review     text,
  created_at timestamptz not null default now(),
  unique (user_id, title_id)
);

create table if not exists interests (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists user_interests (
  user_id     uuid references users(id) on delete cascade,
  interest_id uuid references interests(id) on delete cascade,
  weight      int not null default 1,
  primary key (user_id, interest_id)
);

create table if not exists reco_settings (
  user_id     uuid primary key references users(id) on delete cascade,
  mode        reco_mode not null default 'balanced',
  use_history boolean not null default true,
  use_trends  boolean not null default true
);

create table if not exists reading_lists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(id) on delete cascade,
  name        text not null,
  description text,
  visibility  list_visibility not null default 'private',
  course_id   uuid references courses(id) on delete set null,
  share_slug  text unique,
  created_at  timestamptz not null default now()
);

create table if not exists reading_list_items (
  id       uuid primary key default gen_random_uuid(),
  list_id  uuid not null references reading_lists(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  note     text,
  read_at  timestamptz,
  added_at timestamptz not null default now(),
  unique (list_id, title_id)
);

create table if not exists bookmarks (
  user_id   uuid references users(id) on delete cascade,
  title_id  uuid references titles(id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  label      text not null,
  query      text not null,
  filters    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists course_reserves (
  course_id uuid references courses(id) on delete cascade,
  title_id  uuid references titles(id) on delete cascade,
  primary key (course_id, title_id)
);

-- ---------------------------------------------------------------- facilities
create table if not exists rooms (
  id       uuid primary key default gen_random_uuid(),
  name     text unique not null,
  capacity int not null,
  floor    text not null,
  features text[] not null default '{}'
);

create table if not exists room_bookings (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references rooms(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  slot_start    timestamptz not null,
  slot_end      timestamptz not null,
  checked_in_at timestamptz,
  status        booking_status not null default 'booked',
  created_at    timestamptz not null default now()
);

create table if not exists occupancy_readings (
  id          uuid primary key default gen_random_uuid(),
  zone        text not null,
  seats_total int not null,
  seats_taken int not null,
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- messaging
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  href       text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

-- ---------------------------------------------------------------- search
alter table titles add column if not exists search_tsv tsvector;

create or replace function titles_search_refresh(p_title uuid) returns void as $$
begin
  update titles t set search_tsv =
      setweight(to_tsvector('english', coalesce(t.title,'')), 'A')
   || setweight(to_tsvector('english', coalesce(t.subtitle,'')), 'B')
   || setweight(to_tsvector('english', coalesce((
        select string_agg(a.name,' ') from title_authors ta
        join authors a on a.id = ta.author_id where ta.title_id = t.id),'')), 'B')
   || setweight(to_tsvector('english', coalesce((
        select string_agg(s.name,' ') from title_subjects ts
        join subjects s on s.id = ts.subject_id where ts.title_id = t.id),'')), 'C')
   || setweight(to_tsvector('english', coalesce(t.summary,'')), 'D')
  where t.id = p_title;
end; $$ language plpgsql;

-- ---------------------------------------------------------------- indexes
create index if not exists titles_search_idx      on titles using gin (search_tsv);
create index if not exists titles_trgm_idx        on titles using gin (title gin_trgm_ops);
create index if not exists copies_title_status_ix on copies (title_id, status);
create index if not exists loans_user_open_ix     on loans (user_id, returned_at);
create index if not exists holds_title_queue_ix   on holds (title_id, placed_at);
create index if not exists notif_user_ix          on notifications (user_id, created_at desc);
create index if not exists bookings_slot_ix       on room_bookings (room_id, slot_start);

-- ---------------------------------------------------------------- views
create or replace view title_availability as
select t.id as title_id,
       count(c.id)                                              as copies_total,
       count(c.id) filter (where c.status = 'available')        as copies_available,
       min(c.due_back) filter (where c.status = 'on_loan')      as next_due
from titles t left join copies c on c.title_id = t.id
group by t.id;
