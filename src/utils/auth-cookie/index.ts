import { AUTH_COOKIE_NAME } from '#config'
import type { FastifyReply } from 'fastify'

/**
 * Sets the authentication cookie on a fastify reply. Takes token and expiresAt options.
 */
export const setAuthCookie = (
  reply: FastifyReply,
  options: { token: string; expiresAt: Date }
) => {
  reply.cookie(AUTH_COOKIE_NAME, options.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    signed: true,
    maxAge: Math.floor((options.expiresAt.getTime() - Date.now()) / 1000),
  })
}

/**
 * Clears the authentication cookie on a fastify reply.
 */
export const clearAuthCookie = (reply: FastifyReply) => {
  reply.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}
