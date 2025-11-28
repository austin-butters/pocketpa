import { authenticated } from '#middleware'
import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth/index.js'
import { healthRoutes } from './health/index.js'

export const v0 = async (fastify: FastifyInstance) => {
  await fastify.register(healthRoutes, { prefix: '/health' })
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(authenticated(async (fastify) => {}))
}
