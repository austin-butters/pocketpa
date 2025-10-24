import type { FastifyInstance } from 'fastify'

import { authRoutes } from './auth'

export const api = async (fastify: FastifyInstance) => {
  fastify.get('/health', {
    handler: async (_, reply) => {
      return reply.status(200).send({ status: 'ok' })
    },
  })

  await fastify.register(authRoutes, { prefix: '/auth' })
}
