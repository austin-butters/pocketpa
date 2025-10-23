import {
  ANONYMOUS_COOKIE_NAME,
  ANONYMOUS_COOKIE_OPTIONS,
  generateAnonymousId,
} from '#lib/auth'
import { prisma } from '#lib/prisma'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Extends FastifyRequest to include user information
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      anonymousId: string
      email?: string
      emailVerified?: boolean
    }
  }
}

/**
 * Middleware to handle anonymous authentication
 * Creates a new anonymous user if none exists, or retrieves existing one
 */
export async function anonymousAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Check if user already has an anonymous ID cookie
    let anonymousId = request.cookies[ANONYMOUS_COOKIE_NAME]

    if (!anonymousId) {
      // Generate new anonymous ID
      anonymousId = generateAnonymousId()

      // Set cookie for future requests
      reply.cookie(ANONYMOUS_COOKIE_NAME, anonymousId, ANONYMOUS_COOKIE_OPTIONS)
    }

    // Try to find existing user with this anonymous ID
    let user = await prisma.user.findUnique({
      where: { anonymousId },
      select: {
        id: true,
        anonymousId: true,
        email: true,
        emailVerified: true,
      },
    })

    // If no user exists, create a new anonymous user
    if (!user) {
      user = await prisma.user.create({
        data: {
          anonymousId,
          email: `anonymous_${anonymousId}@example.com`, // Placeholder email
          emailVerified: false,
        },
        select: {
          id: true,
          anonymousId: true,
          email: true,
          emailVerified: true,
        },
      })
    }

    // Attach user to request
    request.user = user
  } catch (error) {
    // Log error but don't fail the request
    request.log.error('Anonymous auth middleware error:', error)

    // Set a fallback anonymous ID if something goes wrong
    const fallbackId = generateAnonymousId()
    reply.cookie(ANONYMOUS_COOKIE_NAME, fallbackId, ANONYMOUS_COOKIE_OPTIONS)

    request.user = {
      id: 'fallback',
      anonymousId: fallbackId,
    }
  }
}
