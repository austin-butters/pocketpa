import { _createSession } from '#data/internal/session'
import {
  _getUserByEmail,
  _verifyUserWithVerificationCode,
} from '#data/internal/user'
import { clearAuthCookie, setAuthCookie } from '#utils/auth-cookie'
import { sanitize } from '#utils/sanitize'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = {
  body: $q({ email: 'string', verificationCode: 'string' }),
}

interface WithSchemaTypeValidation {
  Body: {
    email: string
    verificationCode: string
  }
}

export const verifyLogin = async (fastify: FastifyInstance) => {
  fastify.post<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      const { email, verificationCode } = request.body
      try {
        const { _user } = await _getUserByEmail(email)
        if (_user === undefined) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (
          _user.verificationCode === null ||
          _user.verificationCodeExpiresAt === null
        ) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        const { _user: _checkedUser, _verified } =
          await _verifyUserWithVerificationCode({
            _user,
            code: verificationCode,
          })

        if (_verified) {
          const { _session } = await _createSession(_user.id)
          setAuthCookie(reply, _session)
        }
        // TODO: Add an attempts field to give users a number of attempts.
        // For now this is unlimited, which is not ideal.
        // If potential, roll back to anonymous user after too many failed attempts.
        // If full or potential, revoke the verification code.
        const verified = _verified
        let user = verified ? sanitize.user(_checkedUser) : null
        return reply.status(200).send({ user, verified })
      } catch {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })
}
