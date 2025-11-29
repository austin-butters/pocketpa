import { type PartialClient, type Prisma, prisma } from '#lib/prisma'
import { randomBytes } from 'crypto'

/**
 * WARNING: This is an internal type.
 */
export type _Session = Readonly<
  Awaited<ReturnType<typeof prisma.session.findUniqueOrThrow>>
>

const token = () => randomBytes(32).toString('base64url')

const inOneYear = () => new Date(Date.now() + 60 * 60 * 24 * 365 * 1000)

/**
 * WARNING: This is an internal function.
 */
export const _readSessionFromUniqueWhereInputAndRemoveIfExpired = async (
  uniqueWhereInput: Prisma.SessionWhereUniqueInput,
  client: PartialClient = prisma
): Promise<{ _session: _Session | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _readSessionFromUniqueWhereInputAndRemoveIfExpired(
        uniqueWhereInput,
        client
      )
    )
  }

  const _session = await client.session.findUnique({ where: uniqueWhereInput })
  if (_session === null) return { _session: undefined }
  if (_session.expiresAt < new Date()) {
    await client.session.delete({ where: { id: _session.id } })
    return { _session: undefined }
  }
  return { _session }
}

/**
 * WARNING: This is an internal function.
 */
export const _createSessionWithDefaults = async (
  input: { userId: string },
  client: PartialClient = prisma
): Promise<{ _session: _Session }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createSessionWithDefaults(input, client)
    )
  }

  const _session = await client.session.create({
    data: { userId: input.userId, token: token(), expiresAt: inOneYear() },
  })
  return { _session }
}
