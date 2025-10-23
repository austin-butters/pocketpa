import { PrismaClient } from '@prisma/client'
import type * as runtime from '@prisma/client/runtime/library'

export const prisma = new PrismaClient()

export type PartialClient = Omit<PrismaClient, runtime.ITXClientDenyList>
