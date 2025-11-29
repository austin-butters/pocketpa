import { _getUserByEmail, _refreshVerificationCode } from '#data/internal/user'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = { body: $q({ email: 'string' }) }

interface WithSchemaTypeValidation {
  Body: {
    email: string
  }
}

export const resendVerificationCode = async (fastify: FastifyInstance) => {
  fastify.post<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      const { email } = request.body
      try {
        const { _user } = await _getUserByEmail(email)
        if (_user === undefined) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        await _refreshVerificationCode(_user)
        // TODO: Send the verification code.
        return reply.status(200).send({ resent: true })
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })
}
