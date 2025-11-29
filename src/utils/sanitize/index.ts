import { type _User } from '#data/internal/_user'
import { type User } from '#models/user'

const user = (user: _User): User => {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerified,
  }
}

export const sanitize = { user }
