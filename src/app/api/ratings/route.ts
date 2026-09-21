import { route } from '@/lib/api'
import { rateTitle } from '@/lib/circulation'

export const POST = route<{ titleId: string; stars: number; review?: string }>(async ({ user, body }) =>
  rateTitle(user.id, body.titleId, Number(body.stars), body.review?.trim() || null))
