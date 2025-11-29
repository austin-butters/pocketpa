import { _getUserByEmail, _refreshVerificationCode } from '#data/internal/user'
import { clearAuthCookie } from '#utils/auth-cookie'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = { body: $q({ email: 'string' }) }

interface WithSchemaTypeValidation {
  Body: {
    email: string
  }
}

export const login = async (fastify: FastifyInstance) => {
  fastify.post<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      clearAuthCookie(reply)
      const { email } = request.body
      try {
        const { _user } = await _getUserByEmail(email)
        if (_user === undefined) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        await _refreshVerificationCode(_user)
        // TODO: Send verification code
        return reply.status(204).send()
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })
}
