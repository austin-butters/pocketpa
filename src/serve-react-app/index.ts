import type { FastifyInstance } from 'fastify'

export const reactApp = async (fastify: FastifyInstance) => {
  fastify.get('/*', {
    handler: async (_, reply) => {
      return reply.sendFile('app.html')
    },
  })
}
