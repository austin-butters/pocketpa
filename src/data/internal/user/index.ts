import { type PartialClient, type Prisma, prisma } from '#lib/prisma'
import { CreatePotentialUserData } from '#models/user'
import { randomBytes } from 'crypto'

type _UnvalidatedUser = Readonly<
  Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
>

/**
 * WARNING: This is an internal type
 */
export type _User = _UnvalidatedUser &
  Readonly<
    | { verificationCode: null; verificationCodeExpiresAt: null }
    | { verificationCode: string; verificationCodeExpiresAt: Date }
  > &
  Readonly<
    | {
        email: null
        emailVerified: false
        username: null
        verificationCode: null
        verificationCodeExpiresAt: null
      }
    | {
        email: string
        username: string
        emailVerified: false
        verificationCode: string
        verificationCodeExpiresAt: Date
      }
    | {
        email: string
        username: string
        emailVerified: true
      }
  >

/**
 * WARNING: This is an internal type
 */
export type _UserCreateInput = Prisma.UserCreateInput & {
  id?: never
  createdAt?: never
  updatedAt?: never
  emailVerified?: never
} & (
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
  )
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
    verificationCode: string
    verificationCodeExpiresAt: Date
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

export const _isValidUserType = (
  // TODO: Update validation to match new types, update type flow to extend most cleanly.
  _unvalidatedUser: _UnvalidatedUser
): _unvalidatedUser is _User => {
  const {
    verificationCode,
    verificationCodeExpiresAt,
    email,
    emailVerified,
    username,
  } = _unvalidatedUser

  const hasBothVerificationFields =
    typeof verificationCode === 'string' &&
    verificationCodeExpiresAt instanceof Date
  const hasNeitherVerificationFields =
    verificationCode === null && verificationCodeExpiresAt === null
  const verificationFieldsAreValid =
    hasBothVerificationFields || hasNeitherVerificationFields

  if (!verificationFieldsAreValid) {
    return false
  }

  const hasBothEmailAndUsernameFields =
    typeof email === 'string' && typeof username === 'string'
  const hasNeitherEmailOrUsernameFields = email === null && username === null
  const emailAndUsernameFieldsAreValid =
    hasBothEmailAndUsernameFields || hasNeitherEmailOrUsernameFields

  if (!emailAndUsernameFieldsAreValid) {
    return false
  }

  const isValidAnonymousUser =
    hasNeitherEmailOrUsernameFields &&
    !emailVerified &&
    hasNeitherVerificationFields
  const isValidPotentialUser =
    hasBothEmailAndUsernameFields && !emailVerified && hasBothVerificationFields
  const isValidFullUser = hasBothEmailAndUsernameFields && emailVerified

  const isValidUser =
    isValidAnonymousUser || isValidPotentialUser || isValidFullUser

  return isValidUser
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
  const {
    email,
    emailVerified,
    username,
    verificationCode,
    verificationCodeExpiresAt,
  } = _user
  return (
    typeof email === 'string' &&
    !emailVerified &&
    typeof username === 'string' &&
    verificationCode === null &&
    verificationCodeExpiresAt === null
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
export const _validateUserType = async (
  _unvalidatedUser: _UnvalidatedUser,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (_isValidUserType(_unvalidatedUser)) {
    return { _user: _unvalidatedUser }
  }

  if (client === prisma) {
    return prisma.$transaction((client) =>
      _validateUserType(_unvalidatedUser, client)
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
  // As user has invalid fields, immediately revoke verification code.
  // If user is potential (does not have a verified email), revert to anonymous, deleting username and email, ensuring emailVerified is false.
  const _user = (await client.user.update({
    where: { id },
    data: {
      verificationCode: null,
      verificationCodeExpiresAt: null,
      ...(email === null || !emailVerified
        ? {
            email: null,
            emailVerified: false,
            username: null,
          }
        : undefined),
    },
  })) as _UnvalidatedUser & {
    // Update nullifies verification fields.
    verificationCode: null
    verificationCodeExpiresAt: null
  } & ( // Update may also remove identity fields.
      | { email: null; emailVerified: false; username: null }
      // but if not, email must be verified. Previous throw ensures username is a string
      | { email: string; emailVerified: true; username: string }
    )

  return { _user }
}

/**
 * WARNING: This is an internal function.
 */
export const _validateUser = async (
  _unvalidatedUser: _UnvalidatedUser,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction((client) =>
      _validateUser(_unvalidatedUser, client)
    )
  }

  let { _user } = await _validateUserType(_unvalidatedUser, client)
  if (
    _user.verificationCodeExpiresAt === null ||
    _user.verificationCodeExpiresAt > new Date()
  ) {
    return { _user }
  }
  _user = (await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: null,
      verificationCodeExpiresAt: null,
      ...(_isPotentialUser(_user)
        ? { email: null, username: null }
        : undefined),
    },
  })) as _User
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
  input: _User,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction((client) =>
      _createUserFromValidCreateInput(input, client)
    )
  }

  const _user = client.user.create({ data: input })
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
  if (!_isPotentialUser(_user) && !_isFullUser(_user)) {
    throw new Error('Found an invalid user when querying by email')
  }
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

  _user = (await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: generateVerificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })) as _PotentialUser | _FullUser
  return { _user }
}

//////////
//////////
//////////
//////////
//////////
//////////
//////////

/**
 * WARNING: This is an internal function.
 */
export const _clearVerificationCode = async (
  _user: _User,
  client: PartialClient = prisma
): Promise<{ _user: _User }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      _clearVerificationCode(_user, client)
    )
  }
  const _unvalidated = await client.user.update({
    where: { id: _user.id },
    data: { verificationCode: null, verificationCodeExpiresAt: null },
  })
  if (!_isValidUserType(_unvalidated)) {
    // TO DO - Replace this with type enforced functionality
    throw new Error('Cleared verification code resulted in invalid user.')
  }
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
    data: { backupCode: generateBackupCode() },
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
      backupCode: generateBackupCode(),
      verificationCode: generateVerificationCode(),
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
      verificationCode: generateVerificationCode(),
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
