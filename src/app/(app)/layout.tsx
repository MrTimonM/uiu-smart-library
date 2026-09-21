import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Shell } from '@/components/shell'
import { sql } from '@/lib/db'
import { getNotifications, getUnreadCount } from '@/lib/queries'
import { getSession } from '@/lib/session'
import type { SessionUser } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  const [notifications, unread, accounts] = await Promise.all([
    getNotifications(user.id, 12),
    getUnreadCount(user.id),
    sql<SessionUser[]>`
      (select id, uiu_id, name, email, role, department, avatar_hue from users where role='student' order by uiu_id limit 4)
      union all
      (select id, uiu_id, name, email, role, department, avatar_hue from users where role='faculty' order by uiu_id limit 2)
      union all
      (select id, uiu_id, name, email, role, department, avatar_hue from users where role='staff' order by uiu_id limit 2)`,
  ])

  return (
    <Suspense>
      <Shell user={user} unread={unread} notifications={notifications} accounts={accounts}>
        {children}
      </Shell>
    </Suspense>
  )
}
