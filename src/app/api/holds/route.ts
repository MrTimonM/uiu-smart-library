import { route } from '@/lib/api'
import { cancelHold, placeHold } from '@/lib/circulation'

export const POST = route<{ titleId: string }>(async ({ user, body }) =>
  placeHold(user.id, body.titleId))

export const DELETE = route<{ holdId: string }>(async ({ user, body }) =>
  cancelHold(user.id, body.holdId))
