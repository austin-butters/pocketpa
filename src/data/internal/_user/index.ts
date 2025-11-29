// TODO: Create valid update type and helper function.
// TODO: Fix and improve _UserCreateInput type and usage.
// TODO: Only export functions that will and should be used outside of this file.
// TODO: Improve logic for layering validation and processes here.
// TODO: Clean up use of Readonly<>.

import { invariantType } from '#lib/invariant'
import { type PartialClient, type Prisma, prisma } from '#lib/prisma'

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
export const _isPotentialOrFullUser = (
  _user: _User
): _user is _PotentialUser | _FullUser => {
  return _isPotentialUser(_user) || _isFullUser(_user)
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
    throw new Error('Cannot validate user with verified email but no username.') // TODO: Decide on how to error handle. Ideally should not throw.
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
  invariantType(_user, _isValidUser, '_validateUser expected valid user')
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
  invariantType(
    _user,
    _isValidUser,
    '_createUserFromValidCreateInput expected valid user'
  )
  return { _user }
}
