import { _createSession } from '#data/internal/session'
import { _getUserByBackupCode } from '#data/internal/user'
import { clearAuthCookie, setAuthCookie } from '#utils/auth-cookie'
import { sanitize } from '#utils/sanitize'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = { body: $q({ backupCode: 'string' }) }

interface WithSchemaTypeValidation {
  Body: {
    backupCode: string
  }
}

export const loginBackup = async (fastify: FastifyInstance) => {
  fastify.post<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      try {
        const { backupCode } = request.body
        const { _user } = await _getUserByBackupCode(backupCode)
        if (_user === undefined) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        const { _session } = await _createSession(_user.id)
        setAuthCookie(reply, _session)
        const user = sanitize.user(_user)
        return reply.status(200).send({ user })
      } catch {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })
}
