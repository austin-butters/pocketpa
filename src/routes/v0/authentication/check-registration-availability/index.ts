import { emailIsTaken, usernameIsTaken } from '#data/user'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = {
  body: $q({ email: 'string', username: 'string' }),
}

interface WithSchemaTypeValidation {
  Body: {
    email: string
    username: string
  }
}

export const checkRegistrationAvailability = async (
  fastify: FastifyInstance
) => {
  fastify.post<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      const { email, username } = request.body
      try {
        const emailAvailable = !(await emailIsTaken(email))
        const usernameAvailable = !(await usernameIsTaken(username))
        return reply.status(200).send({ emailAvailable, usernameAvailable })
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })
}
