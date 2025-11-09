// TODO: Remove type assertions when possible.
// TODO: Create valid update type and helper function.
// TODO: Fix and improve _UserCreateInput type and usage.
// TODO: Only export functions that will and should be used outside of this file.
// TODO: Improve logic for layering validation and processes here.
// TODO: Setup invariant processes, skipped in production.

import { type PartialClient, type Prisma, prisma } from '#lib/prisma'
import { type CreatePotentialUserData } from '#models/user'
import { randomBytes } from 'crypto'

export type _UnvalidatedUser = Readonly<
  Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
>

/**
 * WARNING: This is an internal type
 */
export type _User = _UnvalidatedUser &
  Readonly<
    // Must have both email and username or neither.
    { email: null; username: null } | { email: string; username: string }
  > &
  Readonly<
    // Must not have verified email if email is null.
    { email: string } | { email: null; emailVerified: false }
  > &
  Readonly<
    // Must have both or neither verification code fields.
    | { verificationCode: null; verificationCodeExpiresAt: null }
    | { verificationCode: string; verificationCodeExpiresAt: Date }
  > &
  // Must not have verification fields without an email to verify.
  Readonly<
    | { email: string }
    | { email: null; verificationCode: null; verificationCodeExpiresAt: null }
  >

/**
 * WARNING: This is an internal type.
 */
export type _AnonymousUser = _User &
  Readonly<{
    email: null
    emailVerified: false
    username: null
    verificationCode: null
    verificationCodeExpiresAt: null
  }>

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

/**
 * WARNING: This is an internal type
 */
export type _UserCreateInput = Readonly<Prisma.UserCreateInput> &
  Readonly<{
    id?: never
    createdAt?: never
    updatedAt?: never
    emailVerified?: never
  }> &
  Readonly<
    | {
        email?: never
        username?: never
        verificationCode?: never
        verificationCodeExpiresAt?: never
      }
    | {
        email: string
        username: string
        verificationCode: string
        verificationCodeExpiresAt: Date
      }
  >

/**
 * WARNING: This is an internal function.
 */
export const _isValidUser = (
  _unvalidatedUser: _UnvalidatedUser
): _unvalidatedUser is _User => {
  const {
    verificationCode,
    verificationCodeExpiresAt,
    email,
    emailVerified,
    username,
  } = _unvalidatedUser

  if ((email === null) !== (username === null)) {
    return false
  }

  if (email === null && emailVerified) {
    return false
  }

  if ((verificationCode === null) !== (verificationCodeExpiresAt === null)) {
    return false
  }

  if (
    email === null &&
    (verificationCode !== null || verificationCodeExpiresAt !== null)
  ) {
    return false
  }

  return true
}

/**
 * WARNING: This is an internal function.
 */
export const _isAnonymousUser = (_user: _User): _user is _AnonymousUser => {
  const {
    email,
    emailVerified,
    username,
    verificationCode,
    verificationCodeExpiresAt,
  } = _user
  return (
    email === null &&
    !emailVerified &&
    username === null &&
    verificationCode === null &&
    verificationCodeExpiresAt === null
  )
}

/**
 * WARNING: This is an internal function.
 */
export const _isPotentialUser = (_user: _User): _user is _PotentialUser => {
  const { email, emailVerified, username } = _user
  return (
    typeof email === 'string' && !emailVerified && typeof username === 'string'
  )
}

/**
 * WARNING: This is an internal function.
 */
export const _isFullUser = (_user: _User): _user is _FullUser => {
  const { email, emailVerified, username } = _user
  return (
    typeof email === 'string' && emailVerified && typeof username === 'string'
  )
}

/**
 * WARNING: This is an internal function.
 */
export const invariantValidUser: (
  _user: _UnvalidatedUser
) => asserts _user is _User = (_user: _UnvalidatedUser) => {
  if (!_isValidUser(_user)) {
    throw new Error('invariantValidUser: assertion failed')
  }
}

/**
 * WARNING: This is an internal function.
 */
export const invariantAnonymousUser: (
  _user: _UnvalidatedUser
) => asserts _user is _AnonymousUser = (_user: _UnvalidatedUser) => {
  if (!_isValidUser(_user) || !_isAnonymousUser(_user)) {
    throw new Error('invariantAnonymousUser: assertion failed')
  }
}

/**
 * WARNING: This is an internal function.
 */
export const invariantPotentialUser: (
  _user: _UnvalidatedUser
) => asserts _user is _PotentialUser = (_user: _UnvalidatedUser) => {
  if (!_isValidUser(_user) || !_isPotentialUser(_user)) {
    throw new Error('invariantPotentialUser: assertion failed')
  }
}

/**
 * WARNING: This is an internal function.
 */
export const invariantFullUser: (
  _user: _UnvalidatedUser
) => asserts _user is _FullUser = (_user: _UnvalidatedUser) => {
  if (!_isValidUser(_user) || !_isFullUser(_user)) {
    throw new Error('invariantFullUser: assertion failed')
  }
}

/**
 * WARNING: This is an internal function.
 */
export const invariantPotentialOrFullUser: (
  _user: _UnvalidatedUser
) => asserts _user is _PotentialUser | _FullUser = (
  _user: _UnvalidatedUser
) => {
  if (
    !_isValidUser(_user) ||
    (!_isPotentialUser(_user) && !_isFullUser(_user))
  ) {
    throw new Error('invariantPotentialOrFullUser: assertion failed')
  }
}

/**
 * WARNING: This is an internal function.
 */
export const _validateUser = async (
  _unvalidatedUser: _UnvalidatedUser,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (_isValidUser(_unvalidatedUser)) {
    return { _user: _unvalidatedUser }
  }

  if (client === prisma) {
    return prisma.$transaction((client) =>
      _validateUser(_unvalidatedUser, client)
    )
  }

  // All the below code exists only for a non-valid user. This should hopefully never be reached.
  // Since fields are invalid, we cannot check _isAnonymousUser or similar, as we don't have a valid _User to pass in.
  const { id, email, emailVerified, username } = _unvalidatedUser
  // If the user is emailVerified with an email, but does not have a username, throw an error.
  // This should never happen as we'll add a creation function that enforces validity.
  // We have no other way to deal with this is we can neither revert email verification or make up a username.
  if (emailVerified && typeof email === 'string' && username === null) {
    throw new Error('Cannot validate user with verified email but no username.')
  }
  const _user = await client.user.update({
    where: { id },
    data: {
      // As user has invalid fields, immediately revoke verification code.
      verificationCode: null,
      verificationCodeExpiresAt: null,
      // If user is potential (does not have a verified email), revert to anonymous, deleting username and email, ensuring emailVerified is false.
      ...(email === null || !emailVerified
        ? {
            email: null,
            emailVerified: false,
            username: null,
          }
        : undefined),
    },
  })
  invariantValidUser(_user)
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUserFromFindUniqueInputAndValidate = async (
  input: Prisma.UserFindUniqueArgs,
  client: PartialClient = prisma
): Promise<{ _user: _User | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction((client) =>
      _getUserFromFindUniqueInputAndValidate(input, client)
    )
  }

  const _unvalidated = await client.user.findUnique(input)
  if (_unvalidated === null) {
    return { _user: undefined }
  }
  const { _user } = await _validateUser(_unvalidated, client)
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _createUserFromValidCreateInput = async (
  input: _UserCreateInput,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction((client) =>
      _createUserFromValidCreateInput(input, client)
    )
  }

  const _user = await client.user.create({ data: input })
  invariantValidUser(_user)
  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _getUser = async (
  id: string,
  client: PartialClient = prisma
): Promise<{ _user: _User | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => _getUser(id, client))
  }

  const { _user } = await _getUserFromFindUniqueInputAndValidate(
    {
      where: { id },
    },
    client
  )
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

  const { _user } = await _getUserFromFindUniqueInputAndValidate(
    {
      where: { backupCode },
    },
    client
  )
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

  const { _user } = await _getUserFromFindUniqueInputAndValidate(
    {
      where: { email },
    },
    client
  )
  if (_user === undefined) {
    return { _user }
  }
  invariantPotentialOrFullUser(_user)
  return { _user }
}

const generateBackupCode = () => randomBytes(32).toString('base64url')

const generateVerificationCode = () =>
  randomBytes(3).readUIntLE(0, 3).toString().padStart(6, '0').slice(0, 6)

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

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

  const _updated = await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: generateVerificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })
  invariantPotentialOrFullUser(_updated)
  return { _user: _updated }
}

/**
 * WARNING: This is an internal function.
 */
export const _clearVerificationCode = async (
  _user: _PotentialUser | _FullUser,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser | _FullUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearVerificationCode(_user, client)
    )
  }

  const _updated = await client.user.update({
    where: { id: _user.id },
    data: { verificationCode: null, verificationCodeExpiresAt: null },
  })
  invariantPotentialOrFullUser(_updated)
  return { _user: _updated }
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
    const _updated = await client.user.update({
      where: { id: _user.id },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    })
    invariantPotentialOrFullUser(_updated)
    return { _user: _updated, _verified }
  }

  // Check field expiration
  if (_user.verificationCodeExpiresAt < new Date()) {
    const _updated = await client.user.update({
      where: { id: _user.id },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    })
    invariantPotentialOrFullUser(_updated)
    return { _user: _updated, _verified }
  }

  // Check code matches
  if (code !== _user.verificationCode) {
    return { _user, _verified }
  }

  // Update, If unverified, verify
  const _updated = await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: null,
      verificationCodeExpiresAt: null,
      ...(!_user.emailVerified ? { emailVerified: true } : undefined),
    },
  })
  invariantPotentialOrFullUser(_updated)
  _verified = true
  return { _user: _updated, _verified }
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
  const { _user } = await _createUserFromValidCreateInput(
    {
      backupCode: generateBackupCode(),
    },
    client
  )
  invariantAnonymousUser(_user)
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

  const { _user } = await _createUserFromValidCreateInput(
    {
      email,
      username,
      backupCode: generateBackupCode(),
      verificationCode: generateVerificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
    client
  )
  invariantPotentialUser(_user)
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

  const _updated = await client.user.update({
    where: { id: _user.id },
    data: {
      email,
      username,
      verificationCode: generateVerificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })
  invariantPotentialUser(_updated)
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

  const _updated = await client.user.update({
    where: { id: _user.id },
    data: {
      email: null,
      emailVerified: false,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      username: null,
    },
  })
  invariantAnonymousUser(_updated)
  return { _user: _updated }
}
