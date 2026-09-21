import postgres from 'postgres'
import { BOOKS, JOURNALS, THESES, EXTRA_AUTHORS, INTERESTS, SUMMARY_TEMPLATES } from './data/books.mjs'

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false })

// deterministic PRNG so every reseed produces the same demo
let s = 20260920
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
const chance = (p) => rnd() < p
const days = (n) => new Date(Date.now() + n * 86400000)

const ZONES = ['Ground Floor — Reading Hall', 'First Floor — Stacks A', 'First Floor — Stacks B', 'Second Floor — Reference', 'Second Floor — Periodicals']
const HUES = [8, 24, 38, 150, 176, 200, 215, 258, 285, 330]

const FIRST = ['Mahedi', 'Mostafizur', 'Minhazul', 'Rafsan', 'Nusrat', 'Farhana', 'Tanvir', 'Sabbir', 'Ayesha', 'Imran', 'Sharmin', 'Zubair', 'Nabila', 'Arif', 'Rafiul', 'Mehjabin', 'Tasnim', 'Shakib', 'Anika', 'Rakibul', 'Sadia', 'Fahim', 'Ishrat', 'Naimur', 'Tahmid', 'Lamia', 'Sourav', 'Maliha', 'Rizwan', 'Samiha', 'Asif', 'Jarin', 'Nafis', 'Prottoy', 'Ridwan', 'Sumaiya']
const LAST = ['Hasan', 'Rahman', 'Hoque', 'Basunia', 'Jahan', 'Akter', 'Ahmed', 'Hossain', 'Siddika', 'Kabir', 'Sultana', 'Islam', 'Karim', 'Mahmud', 'Chowdhury', 'Alam', 'Khan', 'Bhuiyan', 'Sarker', 'Mia', 'Das', 'Roy']
const DEPTS = ['CSE', 'EEE', 'BBA', 'Economics', 'Civil Engineering', 'Pharmacy', 'English']

const COURSES = [
  ['CSE 2215', 'Data Structures and Algorithms I', 'CSE'],
  ['CSE 3411', 'System Analysis and Design Laboratory', 'CSE'],
  ['CSE 3421', 'Database Management Systems', 'CSE'],
  ['CSE 4531', 'Computer Security', 'CSE'],
  ['CSE 4633', 'Machine Learning', 'CSE'],
  ['CSE 3521', 'Computer Networks', 'CSE'],
  ['EEE 2101', 'Electrical Circuits I', 'EEE'],
  ['EEE 3101', 'Signals and Systems', 'EEE'],
  ['EEE 4101', 'Power System Analysis', 'EEE'],
  ['BBA 2101', 'Principles of Marketing', 'BBA'],
  ['BBA 3203', 'Managerial Accounting', 'BBA'],
  ['BBA 4101', 'Strategic Management', 'BBA'],
  ['ECO 2101', 'Principles of Economics', 'Economics'],
  ['ECO 3301', 'Development Economics', 'Economics'],
  ['CE 2101', 'Engineering Mechanics', 'Civil Engineering'],
  ['PHR 2101', 'Pharmacology I', 'Pharmacy'],
  ['ENG 1011', 'English Composition', 'English'],
  ['MATH 1151', 'Calculus and Analytical Geometry', 'CSE'],
]

const ROOMS = [
  ['Discussion Room 1', 6, 'First Floor', ['Whiteboard', 'Power sockets']],
  ['Discussion Room 2', 6, 'First Floor', ['Whiteboard', 'Power sockets']],
  ['Group Study Room A', 8, 'Second Floor', ['Display screen', 'Whiteboard']],
  ['Group Study Room B', 8, 'Second Floor', ['Display screen', 'Power sockets']],
  ['Silent Study Pod', 4, 'Second Floor', ['Quiet zone']],
  ['Seminar Room', 20, 'Ground Floor', ['Projector', 'Whiteboard', 'AC']],
]

const slug = (n) => Math.random().toString(36).slice(2, 10) + n

async function main() {
  console.log('clearing…')
  await sql.unsafe(`truncate notifications, occupancy_readings, room_bookings, rooms,
    course_reserves, saved_searches, bookmarks, reading_list_items, reading_lists,
    reco_settings, user_interests, interests, ratings, ledger_entries, payments,
    fines, holds, loans, loan_rules, digital_assets, copies, title_subjects,
    subjects, title_authors, authors, titles, enrollments, courses, users restart identity cascade`)

  // ------------------------------------------------------------ loan rules
  await sql`insert into loan_rules ${sql([
    { role: 'student', max_items: 5, loan_days: 14, max_renewals: 2 },
    { role: 'faculty', max_items: 12, loan_days: 30, max_renewals: 3 },
    { role: 'staff', max_items: 12, loan_days: 30, max_renewals: 3 },
  ])}`

  // ------------------------------------------------------------ users
  const team = [
    ['Mahedi Hasan Sorol', 'student', 'CSE'],
    ['Mostafizur Rahman Murad', 'student', 'CSE'],
    ['Md Minhazul Hoque', 'student', 'CSE'],
    ['Rafsan Hossen Basunia', 'student', 'CSE'],
  ]
  const userRows = []
  let sid = 11220001
  for (const [name, role, dept] of team) {
    userRows.push({ uiu_id: String(sid++), name, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@bscse.uiu.ac.bd', role, department: dept, avatar_hue: pick(HUES) })
  }
  for (let i = 0; i < 40; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`
    userRows.push({ uiu_id: String(sid++), name, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}.${i}@bscse.uiu.ac.bd`, role: 'student', department: pick(DEPTS), avatar_hue: pick(HUES) })
  }
  const faculty = [
    ['Dr. Salekul Islam', 'CSE'], ['Dr. Mohammad Nurul Huda', 'CSE'],
    ['Dr. Khondaker Abdullah-Al-Mamun', 'CSE'], ['Dr. Rashedur M Rahman', 'EEE'],
    ['Dr. Farhana Yasmin', 'BBA'], ['Dr. Mohammed Masum Iqbal', 'Economics'],
  ]
  let fid = 20010
  for (const [name, dept] of faculty) {
    userRows.push({ uiu_id: String(fid++), name, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@uiu.ac.bd`, role: 'faculty', department: dept, avatar_hue: pick(HUES) })
  }
  const staff = [['Shirin Akter', 'Circulation Desk'], ['Abdul Karim', 'Technical Services'], ['Rokeya Begum', 'Library Administration']]
  let stid = 30010
  for (const [name, dept] of staff) {
    userRows.push({ uiu_id: String(stid++), name, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@lib.uiu.ac.bd`, role: 'staff', department: dept, avatar_hue: pick(HUES) })
  }
  const users = await sql`insert into users ${sql(userRows)} returning *`
  const students = users.filter((u) => u.role === 'student')
  const facultyU = users.filter((u) => u.role === 'faculty')
  const staffU = users.filter((u) => u.role === 'staff')
  console.log(`users: ${users.length}`)

  // ------------------------------------------------------------ courses
  const courses = await sql`insert into courses ${sql(COURSES.map(([code, title, dept]) => ({ code, title, semester: 'Fall 2026', dept })))} returning *`
  const enr = []
  for (const st of students) {
    const mine = courses.filter((c) => c.dept === st.department)
    const chosen = (mine.length ? mine : courses).slice(0, 5).filter(() => chance(0.7))
    for (const c of (chosen.length ? chosen : [pick(courses)])) enr.push({ user_id: st.id, course_id: c.id })
  }
  for (const f of facultyU) enr.push({ user_id: f.id, course_id: pick(courses).id })
  await sql`insert into enrollments ${sql(enr)} on conflict do nothing`

  // ------------------------------------------------------------ interests
  const interests = await sql`insert into interests ${sql(INTERESTS.map((name) => ({ name })))} returning *`

  // ------------------------------------------------------------ catalogue
  const allTitles = []
  for (const [title, author, year, publisher, type, subjects] of BOOKS) allTitles.push({ title, author, year, publisher, type, subjects })
  for (const [title, author, year, publisher, subjects] of JOURNALS) allTitles.push({ title, author, year, publisher, type: 'journal', subjects })
  for (const [title, author, year, dept, subjects] of THESES) allTitles.push({ title, author, year, publisher: `United International University — ${dept}`, type: 'thesis', subjects })

  const titleRows = allTitles.map((t, i) => ({
    type: t.type,
    title: t.title,
    subtitle: t.type === 'thesis' ? `${t.publisher.split('— ')[1]} undergraduate thesis` : null,
    isbn: t.type === 'print' || t.type === 'ebook' ? `978-${int(0, 9)}-${int(100, 999)}-${int(10000, 99999)}-${int(0, 9)}` : null,
    issn: t.type === 'journal' ? `${int(1000, 9999)}-${int(1000, 9999)}` : null,
    publisher: t.publisher,
    year: t.year,
    language: 'English',
    edition: t.type === 'print' && chance(0.5) ? `${int(2, 12)}th edition` : null,
    pages: t.type === 'journal' ? null : int(180, 1180),
    summary: pick(SUMMARY_TEMPLATES),
    cover_hue: HUES[i % HUES.length],
    added_at: days(-int(30, 1400)),
  }))
  const titles = await sql`insert into titles ${sql(titleRows)} returning id, title, type`
  console.log(`titles: ${titles.length}`)
  const byTitle = new Map(titles.map((t) => [t.title, t]))

  // authors
  const authorNames = new Set()
  for (const t of allTitles) {
    authorNames.add(t.author)
    for (const e of EXTRA_AUTHORS[t.title] ?? []) authorNames.add(e)
  }
  const authors = await sql`insert into authors ${sql([...authorNames].map((name) => ({ name })))} returning *`
  const authorId = new Map(authors.map((a) => [a.name, a.id]))
  const ta = []
  for (const t of allTitles) {
    const row = byTitle.get(t.title)
    ta.push({ title_id: row.id, author_id: authorId.get(t.author), ord: 0 })
    let o = 1
    for (const e of EXTRA_AUTHORS[t.title] ?? []) ta.push({ title_id: row.id, author_id: authorId.get(e), ord: o++ })
  }
  await sql`insert into title_authors ${sql(ta)} on conflict do nothing`

  // subjects
  const subjectNames = new Set()
  for (const t of allTitles) t.subjects.forEach((x) => subjectNames.add(x))
  const subjects = await sql`insert into subjects ${sql([...subjectNames].map((name) => ({ name })))} returning *`
  const subjectId = new Map(subjects.map((x) => [x.name, x.id]))
  const ts = []
  for (const t of allTitles) for (const x of t.subjects) ts.push({ title_id: byTitle.get(t.title).id, subject_id: subjectId.get(x) })
  await sql`insert into title_subjects ${sql(ts)} on conflict do nothing`

  // copies
  const copyRows = []
  let acc = 100001
  for (const t of allTitles) {
    const row = byTitle.get(t.title)
    if (t.type === 'ebook') continue
    const n = t.type === 'thesis' ? 1 : t.type === 'journal' ? int(2, 4) : int(2, 6)
    const zone = t.type === 'journal' ? ZONES[4] : t.type === 'thesis' ? ZONES[3] : pick(ZONES.slice(0, 3))
    for (let i = 0; i < n; i++) {
      copyRows.push({
        title_id: row.id,
        accession_number: `UIU-${acc++}`,
        location_zone: zone,
        shelf_bay: `${String.fromCharCode(65 + int(0, 7))}-${int(1, 24)}`,
        copy_type: t.type === 'thesis' || t.type === 'journal' ? 'reference' : i === 0 && chance(0.2) ? 'reserve' : 'circulating',
        status: 'available',
      })
    }
  }
  const copies = await sql`insert into copies ${sql(copyRows)} returning *`
  console.log(`copies: ${copies.length}`)

  // digital assets for ebooks
  const ebooks = titles.filter((t) => t.type === 'ebook')
  if (ebooks.length) {
    await sql`insert into digital_assets ${sql(ebooks.map((t) => ({ title_id: t.id, format: 'pdf', url: null, access_rule: 'campus' })))}`
  }

  // ------------------------------------------------------------ loans
  const circulating = copies.filter((c) => c.copy_type === 'circulating')
  const loanRows = []
  const taken = new Set()
  // historical, returned loans — these feed recommendations
  for (let i = 0; i < 420; i++) {
    const c = pick(circulating)
    const u = pick(students.concat(facultyU))
    const issued = days(-int(30, 400))
    const due = new Date(issued.getTime() + 14 * 86400000)
    loanRows.push({ copy_id: c.id, title_id: c.title_id, user_id: u.id, issued_at: issued, due_at: due, returned_at: new Date(due.getTime() - int(-4, 10) * 86400000), renewals_count: int(0, 2), issued_by: pick(staffU).id })
  }
  // open loans
  const openLoans = []
  for (let i = 0; i < 95; i++) {
    const c = pick(circulating)
    if (taken.has(c.id)) continue
    taken.add(c.id)
    const u = pick(students.concat(facultyU))
    const offset = int(-24, 12)
    const issued = days(offset - 14)
    const due = days(offset)
    openLoans.push({ copy_id: c.id, title_id: c.title_id, user_id: u.id, issued_at: issued, due_at: due, returned_at: null, renewals_count: chance(0.3) ? 1 : 0, issued_by: pick(staffU).id })
  }
  const allLoans = await sql`insert into loans ${sql(loanRows.concat(openLoans))} returning *`
  await sql`update copies set status = 'on_loan', due_back = l.due_at::date from loans l where copies.id = l.copy_id and l.returned_at is null`
  console.log(`loans: ${allLoans.length} (${openLoans.length} open)`)

  // give the demo team a believable personal shelf
  const demo = students[0]
  const demoTitles = ['Introduction to Algorithms', 'Designing Data-Intensive Applications', 'Clean Code', 'Database System Concepts', 'Deep Learning']
  for (const [i, name] of demoTitles.entries()) {
    const t = byTitle.get(name)
    const c = copies.find((x) => x.title_id === t.id && !taken.has(x.id))
    if (!c) continue
    taken.add(c.id)
    const due = days(i === 0 ? -3 : i * 3 + 1) // one overdue, rest upcoming
    await sql`insert into loans (copy_id, title_id, user_id, issued_at, due_at, renewals_count, issued_by)
              values (${c.id}, ${t.id}, ${demo.id}, ${days(-14 + (i === 0 ? -3 : i * 3 + 1))}, ${due}, ${i === 1 ? 1 : 0}, ${staffU[0].id})`
    await sql`update copies set status='on_loan', due_back=${due} where id=${c.id}`
  }

  // ------------------------------------------------------------ holds
  const popular = ['Introduction to Algorithms', 'Clean Code', 'Principles of Marketing', 'Fundamentals of Electric Circuits', 'Artificial Intelligence: A Modern Approach', 'Calculus: Early Transcendentals', 'Atomic Habits', 'Organizational Behavior']
  const holdRows = []
  for (const name of popular) {
    const t = byTitle.get(name)
    const n = int(1, 4)
    for (let i = 0; i < n; i++) holdRows.push({ title_id: t.id, user_id: pick(students).id, placed_at: days(-int(1, 9)), status: 'queued' })
  }
  // one ready-for-pickup hold for the demo user
  const readyTitle = byTitle.get('The Pragmatic Programmer')
  const readyCopy = copies.find((c) => c.title_id === readyTitle.id)
  holdRows.push({ title_id: readyTitle.id, copy_id: readyCopy.id, user_id: demo.id, placed_at: days(-3), status: 'ready', ready_at: days(-1), expires_at: days(1) })
  holdRows.push({ title_id: byTitle.get('Introduction to Algorithms').id, user_id: demo.id, placed_at: days(-2), status: 'queued' })
  await sql`insert into holds ${sql(holdRows.map((h) => ({ copy_id: null, ready_at: null, expires_at: null, ...h })))}`
  await sql`update copies set status='held' where id=${readyCopy.id}`

  // ------------------------------------------------------------ ratings
  const ratingRows = []
  const seen = new Set()
  for (let i = 0; i < 700; i++) {
    const t = pick(titles)
    const u = pick(students.concat(facultyU))
    const k = t.id + u.id
    if (seen.has(k)) continue
    seen.add(k)
    ratingRows.push({
      user_id: u.id, title_id: t.id,
      stars: chance(0.62) ? int(4, 5) : int(2, 4),
      review: chance(0.25) ? pick([
        'Clear explanations, the worked examples helped a lot before the midterm.',
        'Dense in places but the best reference we have for this course.',
        'Good for the fundamentals; skim the later chapters.',
        'Borrowed it for a project and ended up reading the whole thing.',
        'Wish the library held more copies — always on loan.',
        'Very readable. Recommended for anyone starting out.',
      ]) : null,
      created_at: days(-int(5, 500)),
    })
  }
  await sql`insert into ratings ${sql(ratingRows)} on conflict do nothing`
  await sql`update titles t set
      rating_avg = coalesce(r.avg,0), rating_count = coalesce(r.n,0)
    from (select title_id, round(avg(stars)::numeric,2) avg, count(*) n from ratings group by title_id) r
    where r.title_id = t.id`
  await sql`update titles t set borrow_count = coalesce(l.n,0)
    from (select title_id, count(*) n from loans group by title_id) l where l.title_id = t.id`

  // ------------------------------------------------------------ interests / settings
  const ui = []
  for (const u of users) {
    const n = int(2, 5)
    const picked = new Set()
    for (let i = 0; i < n; i++) picked.add(pick(interests).id)
    for (const id of picked) ui.push({ user_id: u.id, interest_id: id, weight: int(1, 3) })
  }
  await sql`insert into user_interests ${sql(ui)} on conflict do nothing`
  await sql`insert into reco_settings ${sql(users.map((u) => ({ user_id: u.id })))} on conflict do nothing`

  // ------------------------------------------------------------ course reserves
  const reserveRows = []
  const reserveMap = {
    'CSE 2215': ['Introduction to Algorithms', 'Data Structures and Algorithms in Java', 'Discrete Mathematics and Its Applications'],
    'CSE 3421': ['Database System Concepts', 'Designing Data-Intensive Applications'],
    'CSE 4633': ['Deep Learning', 'Pattern Recognition and Machine Learning', 'Hands-On Machine Learning with Scikit-Learn and TensorFlow'],
    'CSE 3521': ['Computer Networks', 'Cryptography and Network Security'],
    'CSE 4531': ['Computer Security: Principles and Practice', 'Cryptography and Network Security'],
    'EEE 2101': ['Fundamentals of Electric Circuits', 'Electronic Devices and Circuit Theory'],
    'EEE 3101': ['Signals and Systems', 'Digital Signal Processing'],
    'BBA 2101': ['Principles of Marketing', 'Consumer Behavior'],
    'BBA 3203': ['Managerial Accounting', 'Financial Accounting'],
    'ECO 2101': ['Principles of Economics', 'Macroeconomics'],
    'ENG 1011': ['The Elements of Style', 'Practical English Usage', 'On Writing Well'],
    'MATH 1151': ['Calculus: Early Transcendentals', 'Advanced Engineering Mathematics'],
  }
  for (const [code, names] of Object.entries(reserveMap)) {
    const c = courses.find((x) => x.code === code)
    for (const n of names) if (byTitle.get(n)) reserveRows.push({ course_id: c.id, title_id: byTitle.get(n).id })
  }
  await sql`insert into course_reserves ${sql(reserveRows)} on conflict do nothing`

  // ------------------------------------------------------------ reading lists
  const lists = await sql`insert into reading_lists ${sql([
    { owner_id: demo.id, name: 'Final year project sources', description: 'Everything I am citing in the FYP proposal.', course_id: null, visibility: 'private', share_slug: slug(1) },
    { owner_id: demo.id, name: 'CSE 3421 — Database Management', description: 'Course reserve list, imported.', visibility: 'course', course_id: courses.find((c) => c.code === 'CSE 3421').id, share_slug: slug(2) },
    { owner_id: demo.id, name: 'Read over the break', description: null, course_id: null, visibility: 'link', share_slug: slug(3) },
    { owner_id: students[1].id, name: 'Machine learning starter pack', description: null, course_id: null, visibility: 'link', share_slug: slug(4) },
  ].map((r) => ({ description: null, course_id: null, ...r })))} returning *`
  const li = []
  const listPlan = [
    [0, ['Designing Data-Intensive Applications', 'Database System Concepts', 'Software Engineering', 'Clean Code']],
    [1, ['Database System Concepts', 'Designing Data-Intensive Applications']],
    [2, ['Atomic Habits', 'Sapiens: A Brief History of Humankind', 'The Kite Runner', 'Midnight’s Children']],
    [3, ['Deep Learning', 'Pattern Recognition and Machine Learning', 'Hands-On Machine Learning with Scikit-Learn and TensorFlow']],
  ]
  for (const [idx, names] of listPlan) {
    for (const n of names) {
      const t = byTitle.get(n)
      if (t) li.push({ list_id: lists[idx].id, title_id: t.id, read_at: chance(0.4) ? days(-int(2, 60)) : null })
    }
  }
  await sql`insert into reading_list_items ${sql(li)} on conflict do nothing`

  await sql`insert into bookmarks ${sql(['Refactoring', 'The Mythical Man-Month', 'Zero to One'].map((n) => ({ user_id: demo.id, title_id: byTitle.get(n).id })))} on conflict do nothing`
  await sql`insert into saved_searches ${sql([
    { user_id: demo.id, label: 'Machine learning — available now', query: 'machine learning', filters: { available: true } },
    { user_id: demo.id, label: 'UIU theses in CSE', query: '', filters: { type: 'thesis' } },
  ])}`

  // ------------------------------------------------------------ fines
  const fineRows = []
  const ledgerRows = []
  const overdueDemo = await sql`select l.id, l.title_id, l.due_at from loans l where l.user_id=${demo.id} and l.returned_at is null and l.due_at < now()`
  for (const l of overdueDemo) {
    const late = Math.max(1, Math.floor((Date.now() - new Date(l.due_at)) / 86400000))
    fineRows.push({ user_id: demo.id, loan_id: l.id, title_id: l.title_id, amount: late * 10, days_late: late, status: 'unpaid' })
  }
  for (let i = 0; i < 30; i++) {
    const u = pick(students)
    const late = int(1, 12)
    fineRows.push({ user_id: u.id, title_id: pick(titles).id, amount: late * 10, days_late: late, status: chance(0.55) ? 'paid' : 'unpaid', posted_at: days(-int(3, 120)) })
  }
  const fines = await sql`insert into fines ${sql(fineRows.map((f) => ({ loan_id: null, posted_at: new Date(), ...f })))} returning *`
  // a past paid fine for the demo user, so the ledger is not empty
  await sql`insert into fines ${sql([{ user_id: demo.id, title_id: byTitle.get('Clean Code').id, amount: 40, days_late: 4, status: 'paid', posted_at: days(-60) }])}`
  await sql`insert into payments ${sql([{ user_id: demo.id, amount: 40, method: 'bkash', reference: 'BKS-' + int(100000, 999999), paid_at: days(-58) }])}`
  let bal = 0
  ledgerRows.push({ user_id: demo.id, type: 'charge', amount: 40, description: 'Overdue — Clean Code (4 days)', balance_after: (bal += 40), created_at: days(-60) })
  ledgerRows.push({ user_id: demo.id, type: 'payment', amount: 40, description: 'bKash payment BKS', balance_after: (bal -= 40), created_at: days(-58) })
  for (const f of fines.filter((x) => x.user_id === demo.id)) {
    ledgerRows.push({ user_id: demo.id, type: 'charge', amount: f.amount, description: `Overdue charge (${f.days_late} days)`, balance_after: (bal += Number(f.amount)), created_at: f.posted_at })
  }
  await sql`insert into ledger_entries ${sql(ledgerRows)}`
  console.log(`fines: ${fines.length + 1}`)

  // ------------------------------------------------------------ rooms
  const rooms = await sql`insert into rooms ${sql(ROOMS.map(([name, capacity, floor, features]) => ({ name, capacity, floor, features })))} returning *`
  const bookingRows = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let d = 0; d < 5; d++) {
    for (const r of rooms) {
      for (let h = 9; h < 21; h += 2) {
        if (!chance(d === 0 ? 0.45 : 0.3)) continue
        const start = new Date(today.getTime() + d * 86400000); start.setHours(h, 0, 0, 0)
        bookingRows.push({ room_id: r.id, user_id: pick(students).id, slot_start: start, slot_end: new Date(start.getTime() + 2 * 3600000), status: 'booked' })
      }
    }
  }
  // demo user's own booking, tomorrow 15:00
  const mine = new Date(today.getTime() + 86400000); mine.setHours(15, 0, 0, 0)
  bookingRows.push({ room_id: rooms[2].id, user_id: demo.id, slot_start: mine, slot_end: new Date(mine.getTime() + 2 * 3600000), status: 'booked' })
  await sql`insert into room_bookings ${sql(bookingRows)}`

  // occupancy — hourly readings for the last 24h, peaking 17:00–19:00
  const occ = []
  const zoneCaps = [['Reading Hall', 120], ['Stacks A', 60], ['Stacks B', 60], ['Reference', 40], ['Periodicals', 30]]
  for (let hAgo = 24; hAgo >= 0; hAgo--) {
    const at = new Date(Date.now() - hAgo * 3600000)
    const hour = at.getHours()
    const base = hour < 9 || hour > 21 ? 0.05 : hour >= 17 && hour <= 19 ? 0.85 : hour >= 12 && hour <= 16 ? 0.6 : 0.35
    for (const [zone, cap] of zoneCaps) {
      occ.push({ zone, seats_total: cap, seats_taken: Math.min(cap, Math.round(cap * base * (0.8 + rnd() * 0.4))), recorded_at: at })
    }
  }
  await sql`insert into occupancy_readings ${sql(occ)}`

  // ------------------------------------------------------------ notifications
  const notif = [
    { user_id: demo.id, type: 'hold_ready', title: 'Ready for pickup', body: '“The Pragmatic Programmer” is waiting at the circulation desk. Collect it within 48 hours.', href: '/loans', created_at: days(-1) },
    { user_id: demo.id, type: 'due_soon', title: 'Due in 3 days', body: '“Designing Data-Intensive Applications” is due back on Thursday. You can renew it once more.', href: '/loans', created_at: days(-0.4) },
    { user_id: demo.id, type: 'overdue', title: 'Overdue item', body: '“Introduction to Algorithms” is overdue. A ৳10 per day charge is accruing.', href: '/fines', created_at: days(-0.2) },
    { user_id: demo.id, type: 'new_arrival', title: 'New in the catalogue', body: 'Three new titles were added under Machine Learning this week.', href: '/search?q=machine+learning', created_at: days(-2), read_at: days(-1.5) },
    { user_id: demo.id, type: 'room', title: 'Room booked', body: 'Group Study Room A is reserved for you tomorrow at 15:00.', href: '/rooms', created_at: days(-0.6) },
  ]
  for (const st of students.slice(1, 12)) {
    notif.push({ user_id: st.id, type: 'due_soon', title: 'Due in 3 days', body: 'You have an item due back soon.', href: '/loans', created_at: days(-int(0, 3)) })
  }
  await sql`insert into notifications ${sql(notif.map((n) => ({ read_at: null, ...n })))}`

  // ------------------------------------------------------------ search vectors
  console.log('building search index…')
  await sql.unsafe(`
    update titles t set search_tsv =
        setweight(to_tsvector('english', coalesce(t.title,'')), 'A')
     || setweight(to_tsvector('english', coalesce(t.subtitle,'')), 'B')
     || setweight(to_tsvector('english', coalesce((select string_agg(a.name,' ') from title_authors ta join authors a on a.id=ta.author_id where ta.title_id=t.id),'')), 'B')
     || setweight(to_tsvector('english', coalesce((select string_agg(s.name,' ') from title_subjects ts join subjects s on s.id=ts.subject_id where ts.title_id=t.id),'')), 'C')
     || setweight(to_tsvector('english', coalesce(t.summary,'') || ' ' || coalesce(t.publisher,'')), 'D')`)

  console.log('\nseed complete.')
  console.log(`  demo student : ${demo.name} (${demo.uiu_id})`)
  console.log(`  faculty      : ${facultyU[0].name}`)
  console.log(`  staff        : ${staffU[0].name}`)
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => sql.end())
