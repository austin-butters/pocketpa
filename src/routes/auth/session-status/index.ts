import { AUTH_COOKIE_NAME } from '#config'
import { _readCurrentSessionFromToken } from '#data/internal/session'
import { _getUser } from '#data/internal/user'
import { type User } from '#models/user'
import { sanitize } from '#utils/sanitize'
import { $q } from '@austin-butters/quickschema'
import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'

// TODO: Use imported helpers here rather than hardcoded.
const standardClearSignedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
} as const

const clearAuthCookie = (reply: FastifyReply) => {
  reply.clearCookie(AUTH_COOKIE_NAME, standardClearSignedCookieOptions)
}

const getToken = (request: FastifyRequest) => request.cookies[AUTH_COOKIE_NAME]

export async function sessionStatusRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      body: $q({}),
    },
    handler: async (request, reply) => {
      const token = getToken(request)
      let sessionExists: boolean = false
      let user: User | null = null
      if (typeof token === 'string') {
        try {
          const { _session } = await _readCurrentSessionFromToken(token)
          if (_session !== undefined) {
            const { _user } = await _getUser(_session.userId)
            if (_user !== undefined) {
              user = sanitize.user(_user)
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
}
