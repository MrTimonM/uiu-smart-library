import { route } from '@/lib/api'
import { payFines } from '@/lib/circulation'

export const POST = route<{ method: 'bkash' | 'rocket' | 'card' }>(async ({ user, body }) =>
  payFines(user.id, body.method))
