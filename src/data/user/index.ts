import { prisma, type PartialClient } from '#lib/prisma'
import { UserTypes } from '#models/user'

export const createUser = async (
  data: UserTypes.CreateUserData,
  client: PartialClient = prisma
): Promise<UserTypes.User> => {
  return client.user.create({ data })
}

export const getUser = async (
  id: string,
  client: PartialClient = prisma
): Promise<UserTypes.User | undefined> => {
  const user = await client.user.findUnique({ where: { id } })
  return user ?? undefined
}

export const deleteUser = async (
  id: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  const deleted = await client.user.delete({ where: { id } })
  return !!deleted
}
