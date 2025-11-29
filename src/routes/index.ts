import { withRequestContext } from '#middleware/with-request-context.js'
import { type FastifyInstance } from 'fastify'
import { v0 } from './v0/index.js'

export const api = withRequestContext(async (fastify: FastifyInstance) => {
  await fastify.register(v0, { prefix: '/v0' })
})
