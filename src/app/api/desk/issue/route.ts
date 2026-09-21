import { route } from '@/lib/api'
import { issueCopy } from '@/lib/circulation'

export const POST = route<{ accession: string; member: string }>(
  async ({ user, body }) => issueCopy(user.id, body.accession.trim(), body.member.trim()),
  { staff: true },
)
