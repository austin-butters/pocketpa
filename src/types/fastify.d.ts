import '@fastify/cookie'
import 'fastify'

import { type _User } from '#data/internal/user'
declare module 'fastify' {
  interface FastifyRequest {
    _user?: _User
  }
}
