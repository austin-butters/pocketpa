import { AUTH_COOKIE_NAME } from '#config'
import type { _Session } from '#data/internal/session/index.js'
import type { _User } from '#data/internal/user/index.js'
import { type FastifyRequest } from 'fastify'
import { AsyncLocalStorage } from 'node:async_hooks'

interface RequestContext {
  request?: FastifyRequest
  _user?: _User
  _session?: _Session
}

const REQUEST_CONTEXT = new AsyncLocalStorage<RequestContext>()

export const setRequestContext = (context: RequestContext) => {
  REQUEST_CONTEXT.enterWith(context)
}

export const getOptionalRequestContext = () => REQUEST_CONTEXT.getStore()

export const getRequestContext = () => {
  const context = REQUEST_CONTEXT.getStore()
  if (!context) {
    throw new Error('Request context not found')
  }
  return context
}

export const getOptionalRequest = () => getOptionalRequestContext()?.request

export const getRequest = () => {
  const request = getRequestContext().request
  if (!request) {
    throw new Error('Request not found in context')
  }
  return request
}

export const setRequest = (request: FastifyRequest) => {
  const context = getOptionalRequestContext() ?? {}
  if (context.request) {
    throw new Error('Request already set in context')
  }
  context.request = request
  setRequestContext(context)
}

export const getOptionalToken = () =>
  getOptionalRequest()?.cookies[AUTH_COOKIE_NAME]

export const getToken = () => {
  const token = getRequest().cookies[AUTH_COOKIE_NAME]
  if (!token) {
    throw new Error('Authentication token not found.')
  }
  return token
}

export const getOptionalUser = () => ({
  _user: getOptionalRequestContext()?._user,
})

export const getUser = () => {
  const { _user } = getRequestContext()
  if (!_user) {
    throw new Error('User not found in context')
  }
  return { _user }
}

export const setUser = (_user: _User) => {
  const context = getOptionalRequestContext() ?? {}
  if (context._user) {
    throw new Error('User already set in context')
  }
  context._user = _user
  setRequestContext(context)
}

export const getOptionalSession = () => ({
  _session: getOptionalRequestContext()?._session,
})

export const getSession = () => {
  const { _session } = getRequestContext()
  if (!_session) {
    throw new Error('Session not found in context')
  }
  return { _session }
}

export const setSession = (_session: _Session) => {
  const context = getOptionalRequestContext() ?? {}
  if (context._session) {
    throw new Error('Session already set in context')
  }
  context._session = _session
  setRequestContext(context)
}
