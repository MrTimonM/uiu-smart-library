import { route } from '@/lib/api'
import { renewLoan } from '@/lib/circulation'

export const POST = route<{ loanId: string }>(async ({ user, body }) =>
  renewLoan(user.id, body.loanId))
