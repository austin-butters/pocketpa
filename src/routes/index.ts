import type { FastifyInstance } from 'fastify'

import { authenticated } from '#middleware'
import { authRoutes } from '#routes/auth'
import { healthRoutes } from '#routes/health'

export const api = async (fastify: FastifyInstance) => {
  await fastify.register(healthRoutes, { prefix: '/health' })
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(authenticated(async (fastify) => {}))
}
