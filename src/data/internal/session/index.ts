import { PartialClient, prisma } from '#lib/prisma'
import { randomBytes } from 'crypto'

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
): Promise<{ _session: _Session }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _createSession(userId, client))
  }

  const _session = await client.session.create({
    data: { userId, token: token(), expiresAt: inOneYear() },
  })
  return { _session }
}

/**
 * WARNING: This is an internal function.
 */
export const _deleteSession = async (
  sessionId: string,
  client: PartialClient = prisma
): Promise<{ _session: _Session }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _deleteSession(sessionId, client)
    )
  }

  const _session = await client.session.delete({ where: { id: sessionId } })
  return { _session }
}

/**
 * WARNING: This is an internal function.
 */
export const _readCurrentSessionFromToken = async (
  token: string,
  client: PartialClient = prisma
): Promise<{ _session: _Session | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _readCurrentSessionFromToken(token, client)
    )
  }

  const _session =
    (await client.session.findUnique({
      where: { token, expiresAt: { gt: new Date() } },
    })) ?? undefined
  return { _session }
}
