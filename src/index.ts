import { COOKIE_SECRET, PORT } from '#config'
import { prisma } from '#lib/prisma'
import { api } from '#routes'
import { reactApp } from '#src/serve-react-app'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const server = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
  ajv: {
    customOptions: {
      removeAdditional: false,
    },
  },
})

const start = async () => {
  try {
    await server.register(fastifyCookie, {
      secret: COOKIE_SECRET,
    })

    await server.register(api, { prefix: '/api' })

    await server.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
    })

    await server.register(reactApp, { prefix: '/app' })

    server.setNotFoundHandler((_, reply) => {
      return reply.sendFile('index.html')
    })

    await server.listen({ port: PORT, host: '0.0.0.0' })
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
