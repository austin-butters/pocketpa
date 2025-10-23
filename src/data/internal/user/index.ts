import { type PartialClient, prisma } from '#lib/prisma'
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
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _getUser(userId, client))
  }

  const user = await client.user.findUniqueOrThrow({ where: { id: userId } })
  ok(
    _userVerificationFieldsAreValid(user),
    'found incorrectly formed user verification fields when reading user'
  )
  return user
}

/**
 * WARNING: This is an internal function.
 */
export const _getUserType = (user: _User) => {
  if (!user.email) return 'anonymous'
  if (!user.emailVerified) return 'potential'
  return 'full'
}

/**
 * WARNING: This is an internal function.
 */
export const _loginVerificationCodeIsExpired = (user: _User) => {
  ok(
    _getUserType(user) === 'full',
    'only full users can have login verification codes'
  )
  ok(
    !!user.loginVerificationCode && !!user.loginVerificationCodeExpiresAt,
    'no valid login verification code found for full user'
  )
  return user.loginVerificationCodeExpiresAt < new Date()
}

/**
 * WARNING: This is an internal function.
 */
export const _refreshUserLoginVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _refreshUserLoginVerificationCode(userId, client)
    )
  }

  let user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'full',
    'only full users can have login verification codes'
  )
  user = await client.user.update({
    where: { id: userId },
    data: {
      loginVerificationCode: loginVerificationCode(),
      loginVerificationCodeExpiresAt: inOneHour(),
    },
  })
  ok(
    !!user.loginVerificationCode && !!user.loginVerificationCodeExpiresAt,
    'failed to create login verification code'
  )
  return user
}

/**
 * WARNING: This is an internal function.
 */
export const _clearUserLoginVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearUserLoginVerificationCode(userId, client)
    )
  }
  let user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'full',
    'refused to clear login verification code for non-full user. No login verification code should exist.'
  )
  user = await client.user.update({
    where: { id: userId },
    data: { loginVerificationCode: null, loginVerificationCodeExpiresAt: null },
  })
  return user
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
): Promise<{ loginVerified: boolean; user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _checkAndVerifyUserLoginVerificationCode(
        { userId, loginVerificationCode },
        client
      )
    )
  }

  let loginVerified = false
  let user = await _getUser(userId, client)
  ok(_getUserType(user) === 'full', 'only full users can verify login')
  ok(
    !!user.loginVerificationCode && !!user.loginVerificationCodeExpiresAt,
    'no valid login verification code found for user'
  )
  ok(
    !_loginVerificationCodeIsExpired(user),
    'login verification code has expired'
  )
  if (loginVerificationCode === user.loginVerificationCode) {
    user = await _clearUserLoginVerificationCode(userId, client)
    ok(
      !user.loginVerificationCode && !user.loginVerificationCodeExpiresAt,
      'failed to clear login verification code'
    )
    loginVerified = true
  }
  return { loginVerified, user }
}

/**
 * WARNING: This is an internal function.
 */
export const _emailVerificationCodeIsExpired = (user: _User) => {
  ok(
    _getUserType(user) === 'potential',
    'only potential users can have email verification codes'
  )
  ok(
    !!user.emailVerificationCode && !!user.emailVerificationCodeExpiresAt,
    'no valid email verification code found for potential user'
  )
  return user.emailVerificationCodeExpiresAt < new Date()
}

/**
 * WARNING: This is an internal function.
 */
export const _refreshUserEmailVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _refreshUserEmailVerificationCode(userId, client)
    )
  }

  const user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'potential',
    'emailVerificationCode can only be refreshed for potential users'
  )
  return client.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: emailVerificationCode(),
      emailVerificationCodeExpiresAt: inOneDay(),
    },
  })
}

/**
 * WARNING: This is an internal function.
 */
export const _clearUserEmailVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearUserEmailVerificationCode(userId, client)
    )
  }

  const user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'potential',
    'refused to clear email verification code for non-potential user. No email verification code should exist.'
  )
  return client.user.update({
    where: { id: userId },
    data: { emailVerificationCode: null, emailVerificationCodeExpiresAt: null },
  })
}

/**
 * WARNING: This is an internal function.
 */
export const _markUserEmailVerified = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _markUserEmailVerified(userId, client)
    )
  }

  const user = await _getUser(userId, client)
  ok(!user.emailVerified, 'user is already email verified')
  ok(
    _getUserType(user) === 'potential',
    'only potential users can verify email'
  )
  return client.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  })
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
): Promise<{ emailVerified: boolean; user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _checkAndVerifyUserEmailVerificationCode(
        { userId, emailVerificationCode },
        client
      )
    )
  }

  let emailVerified = false
  let user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'potential',
    'only potential users can verify email'
  )
  ok(
    !!user.emailVerificationCode && !!user.emailVerificationCodeExpiresAt,
    'no valid email verification code found for potential user'
  )
  ok(
    !_emailVerificationCodeIsExpired(user),
    'email verification code has expired'
  )
  if (emailVerificationCode === user.emailVerificationCode) {
    user = await _markUserEmailVerified(userId, client)
    user = await _clearUserEmailVerificationCode(userId, client)
    ok(_getUserType(user) === 'full', 'email verification failed')
    emailVerified = true
  }
  return { emailVerified, user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createAnonymousUser = async (client: PartialClient = prisma) => {
  return client.user.create({ data: { backupCode: backupCode() } })
}

/**
 * WARNING: This is an internal function.
 */
export const _createPotentialUserFromAnonymousUser = async (
  { userId, email }: { userId: string; email: string },
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createPotentialUserFromAnonymousUser({ userId, email }, client)
    )
  }

  let user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'anonymous',
    'potential users must be created from anonymous users'
  )
  user = await client.user.update({
    where: { id: userId },
    data: { email },
  })
  ok(_getUserType(user) === 'potential', 'potential user creation failed')
  user = await _refreshUserEmailVerificationCode(userId, client)
  ok(
    !!user.emailVerificationCode && !!user.emailVerificationCodeExpiresAt,
    'email verification code failed to create'
  )
  return user
}

/**
 * WARNING: This is an internal function.
 */
export const _createFullUserFromPotentialUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createFullUserFromPotentialUser(userId, client)
    )
  }

  let user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'potential',
    'full users must be created from potential users'
  )
  user = await client.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  })
  ok(_getUserType(user) === 'full', 'full user creation failed')
  await _clearUserEmailVerificationCode(userId, client)
  ok(
    !user.emailVerificationCode && !user.emailVerificationCodeExpiresAt,
    'failed to clear user email verification code'
  )
  return user
}

/**
 * WARNING: This is an internal function.
 */
export const _emailIsUsedByAnyUser = async (
  email: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _emailIsUsedByAnyUser(email, client)
    )
  }

  const count = await client.user.count({ where: { email }, take: 1 })
  return count > 0
}

/**
 * WARNING: This is an internal function.
 */
export const _emailIsUsedByFullUser = async (
  email: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _emailIsUsedByFullUser(email, client)
    )
  }

  const count = await client.user.count({
    where: { email, emailVerified: true },
    take: 1,
  })
  return count > 0
}

/**
 * WARNING: This is an internal function.
 */
export const _revertPotentialUserToAnonymousUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<_User> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _revertPotentialUserToAnonymousUser(userId, client)
    )
  }

  let user = await _getUser(userId, client)
  ok(
    _getUserType(user) === 'potential',
    'only potential users can be reverted to anonymous users'
  )
  user = await _clearUserEmailVerificationCode(userId, client)
  ok(
    !user.emailVerificationCode && !user.emailVerificationCodeExpiresAt,
    'failed to clear user email verification code'
  )
  user = await client.user.update({
    where: { id: userId },
    data: { email: null, emailVerified: false },
  })
  ok(
    _getUserType(user) === 'anonymous',
    'failed to revert potential user to anonymous user'
  )
  return user
}
