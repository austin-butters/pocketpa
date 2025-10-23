import { userRoutes } from '#routes/user'
import type { FastifyInstance } from 'fastify'

export const api = async (fastify: FastifyInstance) => {
  fastify.get('/health', {
    handler: async (_, reply) => {
      return reply.status(200).send({ status: 'ok' })
    },
  })

  await fastify.register(userRoutes, { prefix: '/user' })
}
