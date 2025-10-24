import 'dotenv/config'

export const PORT = (() => {
  const { PORT } = process.env
  if (!PORT) {
    throw new Error('PORT is not set')
  }
  if (isNaN(parseInt(PORT, 10))) {
    throw new Error('PORT is not a valid number')
  }
  return parseInt(PORT, 10)
})()

export const AUTH_COOKIE_NAME = (() => {
  const { AUTH_COOKIE_NAME } = process.env
  if (!AUTH_COOKIE_NAME) {
    throw new Error('AUTH_COOKIE_NAME is not set')
  }
  return AUTH_COOKIE_NAME
})()

export const COOKIE_SECRET = (() => {
  const { COOKIE_SECRET } = process.env
  if (!COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET is not set')
  }
  return COOKIE_SECRET
})()
