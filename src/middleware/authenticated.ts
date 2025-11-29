import { getOptionalToken } from '#context'
import { _readCurrentSessionFromToken } from '#data/internal/session'
import { _getUser } from '#data/internal/user'
import { clearAuthCookie } from '#utils/auth-cookie'
import { type FastifyPluginAsync } from 'fastify'

export const authenticated = (
  callback: FastifyPluginAsync
): FastifyPluginAsync => {
  return async (fastify, opts) => {
    fastify.addHook('onRequest', async (request, reply) => {
      const token = getOptionalToken()
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

        // setAuthenticationContext({ _user, _session })
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })
    await callback(fastify, opts)
  }
}
