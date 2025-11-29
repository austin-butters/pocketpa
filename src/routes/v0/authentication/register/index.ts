import { getOptionalToken } from '#context'
import { type _Session } from '#data/internal/_session'
import { _isAnonymousUser, type _User } from '#data/internal/_user'
import {
  createSession,
  readCurrentSessionFromToken,
  refreshSession,
} from '#data/session'
import {
  createPotentialUser,
  createPotentialUserFromAnonymousUser,
  getUser,
} from '#data/user'
import { clearAuthCookie, setAuthCookie } from '#utils/auth-cookie'
import { sanitize } from '#utils/sanitize'
import { $q } from '@austin-butters/quickschema'
import { type FastifyInstance } from 'fastify'

const schema = { body: $q({ email: 'string', username: 'string' }) }

interface WithSchemaTypeValidation {
  Body: {
    email: string
    username: string
  }
}

export const register = async (fastify: FastifyInstance) => {
  fastify.post<WithSchemaTypeValidation>('/', {
    schema,
    handler: async (request, reply) => {
      const { email, username } = request.body
      const token = getOptionalToken()
      try {
        let _user: _User
        let _session: _Session
        if (token === undefined) {
          // If no token, create new potential user.
          _user = (await createPotentialUser({ email, username }))._user
          _session = (await createSession(_user.id))._session
        } else {
          // Currently logged in, create potential user from current anonymous user
          // If token invalid (i.e. no session, reject)
          const { _session: _existingSession } =
            await readCurrentSessionFromToken(token)
          if (_existingSession === undefined) {
            clearAuthCookie(reply)
            return reply.status(401).send({ error: 'Unauthorized' })
          }
          // If user from token invalid (i.e. no user, wrong type of user, or non-anonymous user), clear the authentication cookie and reject.
          const { _user: _existingUser } = await getUser(
            _existingSession.userId
          )
          if (_existingUser === undefined) {
            clearAuthCookie(reply)
            return reply.status(401).send({ error: 'Unauthorized' })
          }
          if (!_isAnonymousUser(_existingUser)) {
            return reply.status(403).send({ error: 'Forbidden' })
          }
          // Set session and user.
          _session = (await refreshSession(_existingSession))._session
          _user = (
            await createPotentialUserFromAnonymousUser({
              _user: _existingUser,
              email,
              username,
            })
          )._user
        }
        // TODO: Send the email verification code.
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
