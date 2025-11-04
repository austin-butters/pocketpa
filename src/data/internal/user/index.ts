import { type PartialClient, prisma } from '#lib/prisma'
import { CreatePotentialUserData } from '#models/user'
import { randomBytes } from 'crypto'

type WithNoVerificationCodeFields = Readonly<{
  verificationCode: null
  verificationCodeExpiresAt: null
}>

type WithBothVerificationCodeFields = Readonly<{
  verificationCode: string
  verificationCodeExpiresAt: Date
}>

type _UnvalidatedUser = Readonly<
  Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
>

/**
 * WARNING: This is an internal type
 */
export type _User = _UnvalidatedUser &
  (WithNoVerificationCodeFields | WithBothVerificationCodeFields)

/**
 * WARNING: This is an internal type.
 */
export type _AnonymousUser = _User &
  Readonly<{
    email: null
    emailVerified: false
    username: null
  }> &
  WithNoVerificationCodeFields

/**
 * WARNING: This is an internal type.
 */
export type _PotentialUser = _User &
  Readonly<{
    email: string
    emailVerified: false
    username: string
  }>

/**
 * WARNING: This is an internal type.
 */
export type _FullUser = _User &
  Readonly<{
    email: string
    emailVerified: true
    username: string
  }>

const backupCode = () => randomBytes(32).toString('base64url')

const verificationCode = () =>
  randomBytes(3).readUIntLE(0, 3).toString().padStart(6, '0').slice(0, 6)

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

/**
 * WARNING: This is an internal function.
 */
export const _validateUser = async (
  _user: _UnvalidatedUser,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction((client) => _validateUser(_user, client))
  }

  if (
    _user.verificationCode === null &&
    _user.verificationCodeExpiresAt === null
  ) {
    return { _user: _user as _UnvalidatedUser & WithNoVerificationCodeFields }
  }
  if (
    typeof _user.email === 'string' &&
    typeof _user.verificationCode === 'string' &&
    _user.verificationCodeExpiresAt instanceof Date &&
    _user.verificationCodeExpiresAt > new Date()
  ) {
    return { _user: _user as _UnvalidatedUser & WithBothVerificationCodeFields }
  }
  const _updated = (await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: null,
      verificationCodeExpiresAt: null,
      ...(typeof _user.email === 'string' && !_user.emailVerified
        ? {
            email: null,
            emailVerified: false,
          }
        : undefined),
    },
  })) as _UnvalidatedUser & WithNoVerificationCodeFields
  return { _user: _updated }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUser = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _getUser(userId, client))
  }

  const _unvalidatedUser = await client.user.findUnique({
    where: { id: userId },
  })
  if (!_unvalidatedUser) return { _user: undefined }
  const { _user } = await _validateUser(_unvalidatedUser)
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUserByBackupCode = async (
  backupCode: string,
  client: PartialClient = prisma
): Promise<{ _user: _User | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _getUserByBackupCode(backupCode, client)
    )
  }

  const _unvalidatedUser = await client.user.findUnique({
    where: { backupCode },
  })
  if (!_unvalidatedUser) return { _user: undefined }
  const { _user } = await _validateUser(_unvalidatedUser)
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUserByEmail = async (
  email: string,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser | _FullUser | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _getUserByEmail(email, client))
  }

  const _unvalidatedUser = await client.user.findUnique({ where: { email } })
  if (!_unvalidatedUser) return { _user: undefined }
  const { _user } = await _validateUser(_unvalidatedUser)
  return { _user: _user as _PotentialUser | _FullUser }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUserType = (_user: _User) => {
  return _user.email === null
    ? 'anonymous'
    : !_user.emailVerified
    ? 'potential'
    : 'full'
}

/**
 * WARNING: This is an internal function.
 */
export const _isAnonymousUser = (_user: _User): _user is _AnonymousUser =>
  _getUserType(_user) === 'anonymous'

/**
 * WARNING: This is an internal function.
 */
export const _isPotentialUser = (_user: _User): _user is _PotentialUser =>
  _getUserType(_user) === 'potential'

/**
 * WARNING: This is an internal function.
 */
export const _isFullUser = (_user: _User): _user is _FullUser =>
  _getUserType(_user) === 'full'

/**
 * WARNING: This is an internal function.
 */
export const _refreshVerificationCode = async (
  _user: _PotentialUser | _FullUser,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser | _FullUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _refreshVerificationCode(_user, client)
    )
  }

  _user = (await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: verificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })) as _PotentialUser | _FullUser
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _clearVerificationCode = async (
  userId: string,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearVerificationCode(userId, client)
    )
  }
  const _user = (await client.user.update({
    where: { id: userId },
    data: { verificationCode: null, verificationCodeExpiresAt: null },
  })) as _UnvalidatedUser & WithNoVerificationCodeFields
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _verifyUserWithVerificationCode = async (
  { _user, code }: { _user: _PotentialUser | _FullUser; code: string },
  client: PartialClient = prisma
): Promise<{ _user: _FullUser | _PotentialUser; _verified: boolean }> => {
  if (client === prisma) {
    return prisma.$transaction((client) =>
      _verifyUserWithVerificationCode({ _user, code }, client)
    )
  }

  let _verified = false
  // Check field existance
  if (
    typeof _user.verificationCode !== 'string' ||
    !(_user.verificationCodeExpiresAt instanceof Date)
  ) {
    _user = (await client.user.update({
      where: { id: _user.id },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    })) as _PotentialUser | _FullUser
    return { _user, _verified }
  }

  // Check field expiration
  if (_user.verificationCodeExpiresAt < new Date()) {
    _user = (await client.user.update({
      where: { id: _user.id },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    })) as _PotentialUser | _FullUser
    return { _user, _verified }
  }

  // Check code matches
  if (code !== _user.verificationCode) {
    return { _user, _verified }
  }

  // Update, If unverified, verify
  _user = (await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: null,
      verificationCodeExpiresAt: null,
      ...(!_user.emailVerified ? { emailVerified: true } : undefined),
    },
  })) as _FullUser
  _verified = true
  return { _user, _verified }
}

/**
 * WARNING: This is an internal function.
 */
export const _createAnonymousUser = async (
  client: PartialClient = prisma
): Promise<{ _user: _AnonymousUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _createAnonymousUser(client))
  }
  const _user = (await client.user.create({
    data: { backupCode: backupCode() },
  })) as _AnonymousUser
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createPotentialUser = async (
  { email, username }: CreatePotentialUserData,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createPotentialUser({ email, username }, client)
    )
  }

  const _user = (await client.user.create({
    data: {
      email,
      username,
      backupCode: backupCode(),
      verificationCode: verificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })) as _UnvalidatedUser &
    WithBothVerificationCodeFields & {
      email: string
      username: string
      emailVerified: false
    }

  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createPotentialUserFromAnonymousUser = async (
  {
    _user,
    email,
    username,
  }: { _user: _AnonymousUser; email: string; username: string },
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _createPotentialUserFromAnonymousUser({ _user, email, username }, client)
    )
  }

  const _updated = (await client.user.update({
    where: { id: _user.id },
    data: {
      email,
      username,
      verificationCode: verificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })) as _UnvalidatedUser &
    WithBothVerificationCodeFields & {
      email: string
      username: string
      emailVerified: false
    }

  return { _user: _updated }
}

/**
 * WARNING: This is an internal function.
 */
export const _revertPotentialUserToAnonymousUser = async (
  _user: _PotentialUser,
  client: PartialClient = prisma
): Promise<{ _user: _AnonymousUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _revertPotentialUserToAnonymousUser(_user, client)
    )
  }

  const _updated = (await client.user.update({
    where: { id: _user.id },
    data: {
      email: null,
      emailVerified: false,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      username: null,
    },
  })) as _UnvalidatedUser &
    WithNoVerificationCodeFields & {
      email: null
      username: null
      emailVerified: false
    }
  return { _user: _updated }
}
