import { AUTH_COOKIE_NAME } from '#config'
import {
  _createSession,
  _deleteSession,
  _readCurrentSessionFromToken,
  _refreshSession,
  type _Session,
} from '#data/internal/session'
import {
  _createAnonymousUser,
  _createPotentialUser,
  _createPotentialUserFromAnonymousUser,
  _getUser,
  _getUserByBackupCode,
  _getUserByEmail,
  _isAnonymousUser,
  _refreshVerificationCode,
  type _User,
  _verifyUserWithVerificationCode,
} from '#data/internal/user'
import { emailIsTaken, usernameIsTaken } from '#data/user'
import {
  type AuthPOSTCheckAvailability,
  type AuthPOSTLogin,
  type AuthPOSTLoginAnonymous,
  type AuthPOSTRegisterPotential,
  type AuthPOSTResendVerificationCode,
  type AuthPOSTVerifyLogin,
} from '#models/auth'
import { sanitize } from '#utils/sanitize'
import { $q } from '@austin-butters/quickschema'
import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import { sessionStatusRoutes } from './session-status/index.js'

const standardSetSignedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  signed: true,
} as const

const standardClearSignedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
} as const

const setAuthCookie = (reply: FastifyReply, _session: _Session) => {
  reply.cookie(AUTH_COOKIE_NAME, _session.token, {
    ...standardSetSignedCookieOptions,
    maxAge: Math.floor((_session.expiresAt.getTime() - Date.now()) / 1000),
  })
}

// TODO: Find a better place to export this and the setAuthCookie function.
export const clearAuthCookie = (reply: FastifyReply) => {
  reply.clearCookie(AUTH_COOKIE_NAME, standardClearSignedCookieOptions)
}

const getToken = (request: FastifyRequest) => request.cookies[AUTH_COOKIE_NAME]

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.register(sessionStatusRoutes, { prefix: 'session-status' })

  // Before registering, allow a user to check if their email or username is available.
  fastify.post<AuthPOSTCheckAvailability>('/check-registration-availability', {
    schema: {
      body: $q({ email: 'string', username: 'string' }),
    },
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

  fastify.post('/register-anonymous', {
    schema: {
      body: $q({}),
    },
    handler: async (request, reply) => {
      const token = getToken(request)
      if (token !== undefined) {
        return reply.status(400).send({
          error: 'Bad Request: must be logged out to register anonymous user',
        })
      }
      try {
        const { _user } = await _createAnonymousUser()
        const { _session } = await _createSession(_user.id)
        setAuthCookie(reply, _session)
        const user = sanitize.user(_user)
        return reply.status(201).send({ user })
      } catch (error) {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // Register potential user, either new or from anonymous
  fastify.post<AuthPOSTRegisterPotential>('/register', {
    schema: {
      body: $q({ email: 'string', username: 'string' }),
    },
    handler: async (request, reply) => {
      const { email, username } = request.body
      const token = getToken(request)
      try {
        let _user: _User
        let _session: _Session
        if (token === undefined) {
          // If no token, create new potential user.
          _user = (await _createPotentialUser({ email, username }))._user
          _session = (await _createSession(_user.id))._session
        } else {
          // Currently logged in, create potential user from current anonymous user
          // If token invalid (i.e. no session, reject)
          const { _session: _existingSession } =
            await _readCurrentSessionFromToken(token)
          if (_existingSession === undefined) {
            clearAuthCookie(reply)
            return reply.status(401).send({ error: 'Unauthorized' })
          }
          // If user from token invalid (i.e. no user, wrong type of user, or non-anonymous user), clear the authentication cookie and reject.
          const { _user: _existingUser } = await _getUser(
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
          _session = (await _refreshSession(_existingSession))._session
          _user = (
            await _createPotentialUserFromAnonymousUser({
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

  // Log in with backup code. This works for any type of user, but is intended primarily for anonymous users.
  fastify.post<AuthPOSTLoginAnonymous>('/login-backup', {
    schema: {
      body: $q({ backupCode: 'string' }),
    },
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

  // Log in potential or full user with email. If potential, will need to verify email, otherwise will need to verify login.
  fastify.post<AuthPOSTLogin>('/login', {
    schema: {
      body: $q({ email: 'string' }),
    },
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
        return reply.status(200).send()
      } catch {
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // Verify login for full user with email verification code
  fastify.post<AuthPOSTVerifyLogin>('/verify-login', {
    schema: {
      body: $q({ email: 'string', verificationCode: 'string' }),
    },
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

  // Resend email/login verification code if expired.
  fastify.post<AuthPOSTResendVerificationCode>('/resend-verification-code', {
    schema: {
      body: $q({ email: 'string' }),
    },
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

  // Log out, remove session.
  fastify.post('/logout', {
    handler: async (request, reply) => {
      const token = getToken(request)
      if (typeof token === 'string') {
        try {
          const { _session } = await _readCurrentSessionFromToken(token)
          if (_session !== undefined) {
            await _deleteSession(_session.id)
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
