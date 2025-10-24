import { type PartialClient, prisma } from '#lib/prisma'
import { CreatePotentialUserData } from '#models/user'
import { ok } from 'assert'
import { randomBytes } from 'crypto'

/**
 * WARNING: This is an internal type.
 */
export type _User = Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>

const backupCode = () => randomBytes(32).toString('base64url')

const emailVerificationCode = () =>
  randomBytes(3).readUIntLE(0, 3).toString().padStart(6, '0').slice(0, 6)

const inOneDay = () => new Date(Date.now() + 60 * 60 * 24 * 1000)

const loginVerificationCode = () =>
  randomBytes(3).readUIntLE(0, 3).toString().padStart(6, '0').slice(0, 6)

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

/**
 * WARNING: This is an internal function.
 */
export const _userVerificationFieldsAreValid = (user: _User) => {
  return (
    (!!user.email || (!user.email && !user.emailVerified)) &&
    ((!!user.emailVerificationCode && !!user.emailVerificationCodeExpiresAt) ||
      (!user.emailVerificationCode && !user.emailVerificationCodeExpiresAt)) &&
    ((!!user.loginVerificationCode && !!user.loginVerificationCodeExpiresAt) ||
      (!user.loginVerificationCode && !user.loginVerificationCodeExpiresAt))
  )
}

/**
 * WARNING: This is an internal function.
 */
export const _getUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _getUser(userId, client))
  }

  const _user = await client.user.findUniqueOrThrow({ where: { id: userId } })
  ok(
    _userVerificationFieldsAreValid(_user),
    'found incorrectly formed user verification fields when reading user'
  )
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUserType = (_user: _User) => {
  if (!_user.email) return 'anonymous'
  if (!_user.emailVerified) return 'potential'
  return 'full'
}

/**
 * WARNING: This is an internal function.
 */
export const _loginVerificationCodeIsExpired = (_user: _User) => {
  ok(
    _getUserType(_user) === 'full',
    'only full users can have login verification codes'
  )
  ok(
    !!_user.loginVerificationCode && !!_user.loginVerificationCodeExpiresAt,
    'no valid login verification code found for full user'
  )
  const _expired = _user.loginVerificationCodeExpiresAt < new Date()
  return { _expired }
}

/**
 * WARNING: This is an internal function.
 */
export const _refreshUserLoginVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _refreshUserLoginVerificationCode(userId, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'full',
    'only full users can have login verification codes'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: {
      loginVerificationCode: loginVerificationCode(),
      loginVerificationCodeExpiresAt: inOneHour(),
    },
  })
  ok(
    !!_user.loginVerificationCode && !!_user.loginVerificationCodeExpiresAt,
    'failed to create login verification code'
  )
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _clearUserLoginVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearUserLoginVerificationCode(userId, client)
    )
  }
  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'full',
    'refused to clear login verification code for non-full user. No login verification code should exist.'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: { loginVerificationCode: null, loginVerificationCodeExpiresAt: null },
  })
  return { _user }
}
/**
 * WARNING: This is an internal function.
 */
export const _checkAndVerifyUserLoginVerificationCode = async (
  {
    userId,
    loginVerificationCode,
  }: { userId: string; loginVerificationCode: string },
  client: PartialClient = prisma
): Promise<{ _loginVerified: boolean; _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _checkAndVerifyUserLoginVerificationCode(
        { userId, loginVerificationCode },
        client
      )
    )
  }

  let _loginVerified = false
  let { _user } = await _getUser(userId, client)
  ok(_getUserType(_user) === 'full', 'only full users can verify login')
  ok(
    !!_user.loginVerificationCode && !!_user.loginVerificationCodeExpiresAt,
    'no valid login verification code found for user'
  )
  ok(
    !_loginVerificationCodeIsExpired(_user),
    'login verification code has expired'
  )
  if (loginVerificationCode === _user.loginVerificationCode) {
    _user = (await _clearUserLoginVerificationCode(userId, client))._user
    ok(
      !_user.loginVerificationCode && !_user.loginVerificationCodeExpiresAt,
      'failed to clear login verification code'
    )
    _loginVerified = true
  }
  return { _loginVerified, _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _emailVerificationCodeIsExpired = (
  user: _User
): { _expired: boolean } => {
  ok(
    _getUserType(user) === 'potential',
    'only potential users can have email verification codes'
  )
  ok(
    !!user.emailVerificationCode && !!user.emailVerificationCodeExpiresAt,
    'no valid email verification code found for potential user'
  )
  const _expired = user.emailVerificationCodeExpiresAt < new Date()
  return { _expired }
}

/**
 * WARNING: This is an internal function.
 */
export const _refreshUserEmailVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _refreshUserEmailVerificationCode(userId, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'potential',
    'emailVerificationCode can only be refreshed for potential users'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: emailVerificationCode(),
      emailVerificationCodeExpiresAt: inOneDay(),
    },
  })

  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _clearUserEmailVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearUserEmailVerificationCode(userId, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'potential',
    'refused to clear email verification code for non-potential user. No email verification code should exist.'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: { emailVerificationCode: null, emailVerificationCodeExpiresAt: null },
  })

  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _markUserEmailVerified = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _markUserEmailVerified(userId, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(!_user.emailVerified, 'user is already email verified')
  ok(
    _getUserType(_user) === 'potential',
    'only potential users can verify email'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  })

  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _checkAndVerifyUserEmailVerificationCode = async (
  {
    userId,
    emailVerificationCode,
  }: { userId: string; emailVerificationCode: string },
  client: PartialClient = prisma
): Promise<{ _emailVerified: boolean; _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _checkAndVerifyUserEmailVerificationCode(
        { userId, emailVerificationCode },
        client
      )
    )
  }

  let _emailVerified = false
  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'potential',
    'only potential users can verify email'
  )
  ok(
    !!_user.emailVerificationCode && !!_user.emailVerificationCodeExpiresAt,
    'no valid email verification code found for potential user'
  )
  ok(
    !_emailVerificationCodeIsExpired(_user),
    'email verification code has expired'
  )
  if (emailVerificationCode === _user.emailVerificationCode) {
    _user = (await _markUserEmailVerified(userId, client))._user
    _user = (await _clearUserEmailVerificationCode(userId, client))._user
    ok(_getUserType(_user) === 'full', 'email verification failed')
    _emailVerified = true
  }
  return { _emailVerified, _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createAnonymousUser = async (
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _createAnonymousUser(client))
  }
  const _user = await client.user.create({ data: { backupCode: backupCode() } })
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createPotentialUser = async (
  { email, username }: CreatePotentialUserData,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createPotentialUser({ email, username }, client)
    )
  }

  const _user = await client.user.create({
    data: {
      email,
      username,
      backupCode: backupCode(),
    },
  })
  ok(_getUserType(_user) === 'potential', 'potential user creation failed')
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createPotentialUserFromAnonymousUser = async (
  { userId, email }: { userId: string; email: string },
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createPotentialUserFromAnonymousUser({ userId, email }, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'anonymous',
    'potential users must be created from anonymous users'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: { email },
  })
  ok(_getUserType(_user) === 'potential', 'potential user creation failed')
  _user = (await _refreshUserEmailVerificationCode(userId, client))._user
  ok(
    !!_user.emailVerificationCode && !!_user.emailVerificationCodeExpiresAt,
    'email verification code failed to create'
  )
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createFullUserFromPotentialUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createFullUserFromPotentialUser(userId, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'potential',
    'full users must be created from potential users'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  })
  ok(_getUserType(_user) === 'full', 'full user creation failed')
  await _clearUserEmailVerificationCode(userId, client)
  ok(
    !_user.emailVerificationCode && !_user.emailVerificationCodeExpiresAt,
    'failed to clear user email verification code'
  )
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _revertPotentialUserToAnonymousUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _revertPotentialUserToAnonymousUser(userId, client)
    )
  }

  let { _user } = await _getUser(userId, client)
  ok(
    _getUserType(_user) === 'potential',
    'only potential users can be reverted to anonymous users'
  )
  _user = (await _clearUserEmailVerificationCode(userId, client))._user
  ok(
    !_user.emailVerificationCode && !_user.emailVerificationCodeExpiresAt,
    'failed to clear user email verification code'
  )
  _user = await client.user.update({
    where: { id: userId },
    data: { email: null, emailVerified: false },
  })
  ok(
    _getUserType(_user) === 'anonymous',
    'failed to revert potential user to anonymous user'
  )
  return { _user }
}
