import { getOptionalToken } from '#context'
import { createSession } from '#data/session'
import { createAnonymousUser } from '#data/user'
import { clearAuthCookie, setAuthCookie } from '#utils/auth-cookie'
import { sanitize } from '#utils/sanitize'
import { type FastifyInstance } from 'fastify'

export const registerAnonymous = async (fastify: FastifyInstance) => {
  fastify.post('/', {
    handler: async (_, reply) => {
      const token = getOptionalToken()
      if (token !== undefined) {
        return reply.status(400).send({
          error: 'Bad Request: must be logged out to register anonymous user',
        })
      }
      try {
        const { _user } = await createAnonymousUser()
        const { _session } = await createSession(_user.id)
        setAuthCookie(reply, _session)
        const user = sanitize.user(_user)
        return reply.status(201).send({ user })
      } catch (error) {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })
}
