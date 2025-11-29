import { authenticated } from '#middleware'
import type { FastifyInstance } from 'fastify'
import { authentication } from './authentication/index.js'
import { health } from './health/index.js'

export const v0 = async (fastify: FastifyInstance) => {
  await fastify.register(health, { prefix: '/health' })
  await fastify.register(authentication, { prefix: '/authentication' })
  await fastify.register(authenticated(async (fastify) => {}))
}
