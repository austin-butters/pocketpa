import { type PartialClient, prisma } from '#lib/prisma'

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
