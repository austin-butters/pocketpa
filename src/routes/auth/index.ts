import { AUTH_COOKIE_NAME } from '#config'
import {
  _createSession,
  _readCurrentSessionFromToken,
  _refreshSession,
  _Session,
} from '#data/internal/session'
import {
  _checkAndVerifyUserEmailVerificationCode,
  _checkAndVerifyUserLoginVerificationCode,
  _createAnonymousUser,
  _createPotentialUser,
  _createPotentialUserFromAnonymousUser,
  _getUser,
  _getUserByBackupCode,
  _getUserByEmail,
  _getUserType,
  _refreshUserEmailVerificationCode,
  _refreshUserLoginVerificationCode,
  _User,
} from '#data/internal/user'
import { clearAllSessionsForUser } from '#data/session'
import { emailIsTaken, usernameIsTaken } from '#data/user'
import {
  AuthPOSTCheckAvailability,
  AuthPOSTLogin,
  AuthPOSTLoginAnonymous,
  AuthPOSTRegisterPotential,
  AuthPOSTVerifyEmail,
  AuthPOSTVerifyLogin,
  authSchema,
} from '#models/auth'
import { User } from '#models/user'
import { toPublic } from '#utils/to-public'
import type { FastifyInstance, FastifyReply } from 'fastify'

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

const clearAuthCookie = (reply: FastifyReply) => {
  reply.clearCookie(AUTH_COOKIE_NAME, standardClearSignedCookieOptions)
}

export const authRoutes = async (fastify: FastifyInstance) => {
  // Check if a current session exists for the user. If so. If not, client will have to log in or sign up.
  fastify.get('/session-status', {
    schema: authSchema.GETSessionStatus,
    handler: async (request, reply) => {
      const token = request.cookies[AUTH_COOKIE_NAME]
      let sessionExists: boolean = false
      let user: User | null = null
      if (!!token) {
        try {
          const { _session } = await _readCurrentSessionFromToken(token)
          if (_session) {
            const { _user } = await _getUser(_session.userId)
            if (_user) {
              user = toPublic.user(_user)
              sessionExists = true
            } else {
              clearAuthCookie(reply)
            }
          }
        } catch {
          clearAuthCookie(reply)
          return reply.status(500).send({ error: 'Internal server error' })
        }
      }
      return reply.status(200).send({ sessionExists, user })
    },
  })

  // Before registering, allow a user to check if their email or username is available.
  fastify.post<AuthPOSTCheckAvailability>('/check-registration-availability', {
    schema: authSchema.POSTCheckAvailability,
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
    handler: async (request, reply) => {
      const token = request.cookies[AUTH_COOKIE_NAME]
      if (token) {
        return reply.status(400).send({
          error: 'Bad Request: must be logged out to register anonymous user',
        })
      }
      try {
        const { _user } = await _createAnonymousUser()
        const { _session } = await _createSession(_user.id)
        setAuthCookie(reply, _session)
        const user = toPublic.user(_user)
        return reply.status(201).send({ user })
      } catch (error) {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // Register potential user, either new or from anonymous
  fastify.post<AuthPOSTRegisterPotential>('/register-potential', {
    schema: authSchema.POSTRegisterPotential,
    handler: async (request, reply) => {
      const { email, username } = request.body
      const token = request.cookies[AUTH_COOKIE_NAME]
      try {
        let _user: _User
        let _session: _Session
        if (!token) {
          // Create new potential user.
          _user = (await _createPotentialUser({ email, username }))._user
          _session = (await _createSession(_user.id))._session
        } else {
          // Create potential user from current anonymous user
          const { _session: _existingSession } =
            await _readCurrentSessionFromToken(token)
          if (!_existingSession) {
            clearAuthCookie(reply)
            return reply.status(401).send({ error: 'Unauthorized' })
          }

          const { _user: _existingUser } = await _getUser(
            _existingSession.userId
          )
          // TODO: Internal data functions will throw errors if incorrectly used.
          // Add more checks like this to prevent bad use of them.
          // The server should never return 500 during normal behaviour, for any request.
          if (_getUserType(_existingUser) !== 'anonymous') {
            return reply.status(403).send({ error: 'Forbidden' })
          }

          _session = (await _refreshSession(_existingSession))._session
          _user = (
            await _createPotentialUserFromAnonymousUser({
              userId: _session.userId,
              email,
            })
          )._user
        }
        setAuthCookie(reply, _session)
        const user = toPublic.user(_user)
        return reply.status(201).send({ user })
      } catch (error) {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // Log in with backup code. This works for any type of user, but is intended primarily for anonymous users.
  fastify.post<AuthPOSTLoginAnonymous>('/login-backup', {
    schema: authSchema.POSTLoginAnonymous,
    handler: async (request, reply) => {
      try {
        const { backupCode } = request.body
        const { _user } = await _getUserByBackupCode(backupCode)
        if (!_user) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        clearAllSessionsForUser(_user.id)
        const { _session } = await _createSession(_user.id)
        setAuthCookie(reply, _session)
        const user = toPublic.user(_user)
        return reply.status(200).send({ user })
      } catch {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // Log in potential or full user with email. If potential, will need to verify email, otherwise will need to verify login.
  fastify.post<AuthPOSTLogin>('/login', {
    schema: authSchema.POSTLogin,
    handler: async (request, reply) => {
      const { email } = request.body
      try {
        const { _user } = await _getUserByEmail(email)
        if (!_user) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (_getUserType(_user) === 'potential') {
          await _refreshUserEmailVerificationCode(_user.id)
          // TODO: Send verification code
          return reply.status(200).send({ loginStatus: 'verifyEmail' })
        } else {
          await _refreshUserLoginVerificationCode(_user.id)
          // TODO: Send verification code
          return reply.status(200).send({ loginStatus: 'verifyLogin' })
        }
      } catch {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // // Verify login for full user with email verification code
  fastify.post<AuthPOSTVerifyLogin>('/verify-login', {
    schema: authSchema.POSTVerifyLogin,
    handler: async (request, reply) => {
      const { email, verificationCode } = request.body
      try {
        const { _user } = await _getUserByEmail(email)
        if (!_user) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (_getUserType(_user) !== 'full') {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (
          !_user.loginVerificationCode ||
          !_user.loginVerificationCodeExpiresAt
        ) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        const { _user: _checkedUser, _loginVerified } =
          await _checkAndVerifyUserLoginVerificationCode({
            userId: _user.id,
            loginVerificationCode: verificationCode,
          })
        if (_loginVerified) {
          const { _session } = await _createSession(_user.id)
          setAuthCookie(reply, _session)
        }
        // TODO: Add an attempts field to give users a number of attempts.
        // For now this is unlimited, which is not ideal.
        const verified = _loginVerified
        let user = verified ? toPublic.user(_checkedUser) : null
        return reply.status(200).send({ user, verified })
      } catch {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // Verify email for potential user, will create a full user and session if successful.
  fastify.post<AuthPOSTVerifyEmail>('/verify-email', {
    schema: authSchema.POSTVerifyEmail,
    handler: async (request, reply) => {
      const { email, verificationCode } = request.body
      try {
        const { _user } = await _getUserByEmail(email)
        if (!_user) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (_getUserType(_user) !== 'potential') {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (_user.emailVerified) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        if (
          !_user.emailVerificationCode ||
          !_user.emailVerificationCodeExpiresAt
        ) {
          return reply.status(401).send({ error: 'Unauthorized' })
        }
        const { _user: _checkedUser, _emailVerified } =
          await _checkAndVerifyUserEmailVerificationCode({
            userId: _user.id,
            emailVerificationCode: verificationCode,
          })
        if (_emailVerified) {
          const { _session } = await _createSession(_user.id)
          setAuthCookie(reply, _session)
        }
        // TODO: Add an attempts field to give users a number of attempts.
        // For now this is unlimited, which is not ideal.
        const verified = _emailVerified
        let user = verified ? toPublic.user(_checkedUser) : null
        return reply.status(200).send({ user, verified })
      } catch {
        clearAuthCookie(reply)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  })

  // // Resend email verification code if expired.
  // fastify.post('/resend-email-verification-code', {})
  // // Log out, remove session.
  // fastify.post('/logout', {})
}
