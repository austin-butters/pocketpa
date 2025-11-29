import { getOptionalToken, setSession, setUser } from '#context'
import { readCurrentSessionFromToken } from '#data/session'
import { getUser } from '#data/user'
import { clearAuthCookie } from '#utils/auth-cookie'
import { type FastifyPluginAsync } from 'fastify'

export const authenticated = (
  callback: FastifyPluginAsync
): FastifyPluginAsync => {
  return async (fastify, opts) => {
    fastify.addHook('onRequest', async (_, reply) => {
      const token = getOptionalToken()
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
      try {
        const { _session } = await readCurrentSessionFromToken(token)
        if (!_session) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        const { _user } = await getUser(_session.userId)
        if (!_user) {
          clearAuthCookie(reply)
          return reply.status(401).send({ error: 'Unauthorized' })
        }

        setUser(_user)
        setSession(_session)
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })
    await callback(fastify, opts)
  }
}
