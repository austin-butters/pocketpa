import { AUTH_COOKIE_NAME } from '#config'
import { _readCurrentSessionFromToken } from '#data/internal/session'
import { _getUser } from '#data/internal/user'
import { clearAuthCookie } from '#routes/auth'
import { type FastifyPluginCallback } from 'fastify'

export const authenticated = (
  callback: FastifyPluginCallback
): FastifyPluginCallback => {
  return async (fastify, opts, done) => {
    fastify.addHook('onRequest', async (request, reply) => {
      const token = request.cookies[AUTH_COOKIE_NAME]
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
      try {
        const { _session } = await _readCurrentSessionFromToken(token)
        if (!_session) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        const { _user } = await _getUser(_session.userId)
        if (!_user) {
          clearAuthCookie(reply)
          return reply.status(401).send({ error: 'Unauthorized' })
        }

        request._user = _user
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })
    return callback(fastify, opts, done)
  }
}
