import { PORT } from '#config'
import prisma from '#lib/prisma'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import path from 'path'

const server = Fastify({
  logger: true,
})

const start = async () => {
  try {
    server.get('/health', async (_, reply) => {
      return reply.status(200).send({ status: 'ok' })
    })

    await server.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
    })

    server.setNotFoundHandler((_, reply) => {
      return reply.sendFile('index.html')
    })

    await server.listen({ port: PORT })
    console.log(`Server is listening on port ${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

const shutdown = async (signal: string) => {
  console.log('\n')
  console.log(`Received ${signal}, shutting down gracefully...`)
  try {
    await server.close()
    await prisma.$disconnect()
    console.log('Shutdown complete')
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start()
