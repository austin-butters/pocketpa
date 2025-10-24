import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'

export function checkSensitiveFields(
  request: FastifyRequest,
  _: FastifyReply,
  payload: unknown,
  done: HookHandlerDoneFunction
) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(
      `Found a non-object or null reply payload in route ${request.method} ${request.routeOptions.url}`
    )
  }

  for (const key in payload) {
    if (key.startsWith('_')) {
      throw new Error(
        `Found a sensitive field in the reply payload in route ${request.method} ${request.routeOptions.url}`
      )
    }
  }

  done()
}
