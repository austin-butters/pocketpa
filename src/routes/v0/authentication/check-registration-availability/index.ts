import { emailIsTaken, usernameIsTaken } from '#data/user'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = {
  querystring: $q({ email: 'string', username: 'string' }),
}

interface WithSchemaTypeValidation {
  Querystring: {
    email: string
    username: string
  }
}

export const checkRegistrationAvailability = async (
  fastify: FastifyInstance
) => {
  fastify.get<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      const { email, username } = request.query
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
