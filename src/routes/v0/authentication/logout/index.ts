import { getOptionalToken } from '#context'
import { deleteSession, readCurrentSessionFromToken } from '#data/session'
import { clearAuthCookie } from '#utils/auth-cookie'
import { type FastifyInstance } from 'fastify'

export const logout = async (fastify: FastifyInstance) => {
  fastify.post('/', {
    handler: async (_, reply) => {
      const token = getOptionalToken()
      if (typeof token === 'string') {
        try {
          const { _session } = await readCurrentSessionFromToken(token)
          if (_session !== undefined) {
            await deleteSession(_session.id)
          }
        } catch {
          return reply.status(500).send({ error: 'Internal server error' })
        }
      }
      clearAuthCookie(reply)
      return reply.status(204).send()
    },
  })
}
