import { type PartialClient, prisma } from '#lib/prisma'

export const usernameIsTaken = async (
  username: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      usernameIsTaken(username, client)
    )
  }

  const count = await client.user.count({ where: { username }, take: 1 })
  return count > 0
}

export const emailIsTaken = async (
  email: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => emailIsTaken(email, client))
  }

  const count = await client.user.count({ where: { email }, take: 1 })
  return count > 0
}
