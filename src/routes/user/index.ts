import { createUser, deleteUser, getUser } from '#data/user'
import { UserTypes, userSchema } from '#models/user'
import type { FastifyInstance } from 'fastify'

export const userRoutes = async (fastify: FastifyInstance) => {
  fastify.post<UserTypes.POST>('/', {
    schema: userSchema.POST,
    handler: async (request, reply) => {
      const user = await createUser(request.body)
      return reply.status(201).send(user)
    },
  })

  fastify.get<UserTypes.GET>('/', {
    schema: userSchema.GET,
    handler: async (request, reply) => {
      const user = await getUser(request.params.userId)
      return reply.status(user ? 200 : 404).send(user)
    },
  })

  fastify.delete<UserTypes.DELETE>('/', {
    schema: userSchema.DELETE,
    handler: async (request, reply) => {
      const success = await deleteUser(request.params.userId)
      return reply.status(success ? 204 : 404).send()
    },
  })
}
