import { type FastifyInstance } from 'fastify'
import { checkRegistrationAvailability } from './check-registration-availability/index.js'
import { loginBackup } from './login-backup/index.js'
import { login } from './login/index.js'
import { logout } from './logout/index.js'
import { registerAnonymous } from './register-anonymous/index.js'
import { register } from './register/index.js'
import { resendVerificationCode } from './resend-verification-code/index.js'
import { sessionStatus } from './session-status/index.js'
import { verifyLogin } from './verify-login/index.js'

export const authentication = async (fastify: FastifyInstance) => {
  await fastify.register(sessionStatus, { prefix: 'session-status' })
  await fastify.register(checkRegistrationAvailability, {
    prefix: 'check-registration-availability',
  })
  await fastify.register(registerAnonymous, { prefix: 'register-anonymous' })
  await fastify.register(register, { prefix: 'register' })
  await fastify.register(loginBackup, { prefix: 'login-backup' })
  await fastify.register(login, { prefix: 'login' })
  await fastify.register(verifyLogin, { prefix: 'verify-login' })
  await fastify.register(resendVerificationCode, {
    prefix: 'resend-verification-code',
  })
  await fastify.register(logout, { prefix: 'logout' })
}
