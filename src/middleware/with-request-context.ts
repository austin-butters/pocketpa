import { setRequest } from '#context'
import { type FastifyPluginAsync } from 'fastify'

export const withRequestContext = (
  callback: FastifyPluginAsync
): FastifyPluginAsync => {
  return async (fastify, opts) => {
    fastify.addHook('onRequest', async (request) => {
      setRequest(request)
    })
    await callback(fastify, opts)
  }
}
