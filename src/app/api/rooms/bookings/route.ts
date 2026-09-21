import { route } from '@/lib/api'
import { bookRoom, cancelBooking, checkInBooking } from '@/lib/circulation'

export const POST = route<{ roomId: string; slotStart: string }>(async ({ user, body }) =>
  bookRoom(user.id, body.roomId, body.slotStart))

export const PATCH = route<{ bookingId: string }>(async ({ user, body }) =>
  checkInBooking(user.id, body.bookingId))

export const DELETE = route<{ bookingId: string }>(async ({ user, body }) =>
  cancelBooking(user.id, body.bookingId))
