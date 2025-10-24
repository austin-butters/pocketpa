import { type _User } from '#data/internal/user'
import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    _user: _User
  }
}

export interface FastifyUnauthenticatedRequest
  extends Omit<FastifyRequest, '_user'> {}
