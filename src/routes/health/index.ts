import { type FastifyInstance } from 'fastify'

export const healthRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', {
    handler: async (_, reply) => {
      return reply.status(200).send({ status: 'ok' })
    },
  })
}
