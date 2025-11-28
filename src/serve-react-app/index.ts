import { type FastifyInstance, type RouteHandler } from 'fastify'

const handler: RouteHandler = (_, reply) => reply.sendFile('app.html')

export const reactApp = async (fastify: FastifyInstance) => {
  fastify.get('/', { handler })
  fastify.get('/*', { handler })
}
