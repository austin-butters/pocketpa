import type { FastifyInstance } from 'fastify'

import { authenticated, checkSensitiveFields } from '#middleware'
import { authRoutes } from './auth'
import { healthRoutes } from './health'

export const api = async (fastify: FastifyInstance) => {
  fastify.addHook('preSerialization', checkSensitiveFields)
  await fastify.register(healthRoutes, { prefix: '/health' })
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(authenticated(async (fastify) => {}))
}
