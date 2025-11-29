import {
  _createSessionWithDefaults,
  _readSessionFromUniqueWhereInputAndRemoveIfExpired,
  type _Session,
} from '#data/internal/_session'
import { type PartialClient, prisma } from '#lib/prisma'

const inOneYear = () => new Date(Date.now() + 60 * 60 * 24 * 365 * 1000)

export const clearAllSessionsForUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<void> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      clearAllSessionsForUser(userId, client)
    )
  }

  await client.session.deleteMany({ where: { userId } })
}

export const createSession = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _session: _Session }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => createSession(userId, client))
  }

  const { _session } = await _createSessionWithDefaults({ userId }, client)
  return { _session }
}

export const deleteSession = async (
  sessionId: string,
  client: PartialClient = prisma
): Promise<{ _session: _Session }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      deleteSession(sessionId, client)
    )
  }

  const _session = await client.session.delete({ where: { id: sessionId } })
  return { _session }
}

export const readCurrentSessionFromToken = async (
  token: string,
  client: PartialClient = prisma
): Promise<{ _session: _Session | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      readCurrentSessionFromToken(token, client)
    )
  }

  const _session =
    (
      await _readSessionFromUniqueWhereInputAndRemoveIfExpired(
        { token },
        client
      )
    )._session ?? undefined
  return { _session }
}

export const refreshSession = async (
  _session: _Session,
  client: PartialClient = prisma
): Promise<{ _session: _Session }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      refreshSession(_session, client)
    )
  }

  const _updated = await client.session.update({
    where: { id: _session.id },
    data: {
      expiresAt: inOneYear(),
    },
  })
  return { _session: _updated }
}
