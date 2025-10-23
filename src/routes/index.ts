import type { FastifyInstance } from 'fastify'

export const api = async (fastify: FastifyInstance) => {
  fastify.get('/health', {
    handler: async (_, reply) => {
      return reply.status(200).send({ status: 'ok' })
    },
  })
}
