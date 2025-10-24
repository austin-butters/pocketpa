import { type FastifyUnauthenticatedRequest } from '#types/fastify'
import { type FastifyInstance } from 'fastify'

export const healthRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', {
    handler: async (_: FastifyUnauthenticatedRequest, reply) => {
      return reply.status(200).send({ status: 'ok' })
    },
  })
}
