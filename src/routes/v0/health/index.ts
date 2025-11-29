import { type FastifyInstance } from 'fastify'

export const health = async (fastify: FastifyInstance) => {
  fastify.get('/', {
    handler: (_, reply) => reply.status(200).send({ status: 'ok' }),
  })
}
