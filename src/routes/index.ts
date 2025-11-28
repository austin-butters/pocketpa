import { type FastifyInstance } from 'fastify'
import { v0 } from './v0/index.js'

export const api = async (fastify: FastifyInstance) => {
  await fastify.register(v0, { prefix: '/v0' })
}
