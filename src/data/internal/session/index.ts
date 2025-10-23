import { PartialClient, prisma } from '#lib/prisma'
import { randomBytes } from 'crypto'
import { _User } from '../user'

/**
 * WARNING: This is an internal type.
 */
export type _Session = Awaited<
  ReturnType<typeof prisma.session.findUniqueOrThrow>
>

const token = () => randomBytes(32).toString('base64url')

const inOneYear = () => new Date(Date.now() + 60 * 60 * 24 * 365 * 1000)

/**
 * WARNING: This is an internal function.
 */
export const _createSession = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_Session> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _createSession(userId, client))
  }

  return client.session.create({
    data: { userId, token: token(), expiresAt: inOneYear() },
  })
}

/**
 * WARNING: This is an internal function.
 */
export const _deleteSession = async (
  sessionId: string,
  client: PartialClient = prisma
): Promise<_Session> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _deleteSession(sessionId, client)
    )
  }

  return client.session.delete({ where: { id: sessionId } })
}

/**
 * WARNING: This is an internal function.
 */
export const _readCurrentSessionFromToken = async (
  token: string,
  client: PartialClient = prisma
): Promise<(_Session & { user: _User }) | undefined> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _readCurrentSessionFromToken(token, client)
    )
  }

  const session = await client.session.findUnique({
    where: { token, expiresAt: { gt: new Date() } },
    include: { user: true },
  })
  return session ?? undefined
}
