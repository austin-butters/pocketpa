import {
  _createUserFromValidCreateInput,
  _getUserFromFindUniqueInputAndValidate,
  _isAnonymousUser,
  _isPotentialOrFullUser,
  _isPotentialUser,
  _isValidUser,
  type _AnonymousUser,
  type _FullUser,
  type _PotentialUser,
  type _User,
} from '#data/internal/_user'
import { invariantType } from '#lib/invariant'
import { prisma, type PartialClient } from '#lib/prisma'
import type { CreatePotentialUserData } from '#models/user'
import { randomBytes } from 'crypto'

export const usernameIsTaken = async (
  username: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      usernameIsTaken(username, client)
    )
  }

  const count = await client.user.count({ where: { username }, take: 1 })
  return count > 0
}

export const emailIsTaken = async (
  email: string,
  client: PartialClient = prisma
): Promise<boolean> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => emailIsTaken(email, client))
  }

  const count = await client.user.count({ where: { email }, take: 1 })
  return count > 0
}

export const getUser = async (
  id: string,
  client: PartialClient = prisma
): Promise<{ _user: _User | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => getUser(id, client))
  }

  const { _user } = await _getUserFromFindUniqueInputAndValidate(
    {
      where: { id },
    },
    client
  )
  return { _user }
}

export const getUserByBackupCode = async (
  backupCode: string,
  client: PartialClient = prisma
): Promise<{ _user: _User | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      getUserByBackupCode(backupCode, client)
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

export const getUserByEmail = async (
  email: string,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser | _FullUser | undefined }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => getUserByEmail(email, client))
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
  invariantType(
    _user,
    _isPotentialOrFullUser,
    'getUserByEmail expected potential or full user'
  )
  return { _user }
}

const generateVerificationCode = () =>
  randomBytes(3).readUIntLE(0, 3).toString().padStart(6, '0').slice(0, 6)

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

const generateBackupCode = () => randomBytes(32).toString('base64url')

export const refreshVerificationCode = async (
  _user: _PotentialUser | _FullUser,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser | _FullUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      refreshVerificationCode(_user, client)
    )
  }

  const _updated = await client.user.update({
    where: { id: _user.id },
    data: {
      verificationCode: generateVerificationCode(),
      verificationCodeExpiresAt: inOneHour(),
    },
  })
  invariantType(
    _updated,
    _isValidUser,
    'refreshVerificationCode expected valid user'
  )
  invariantType(
    _updated,
    _isPotentialOrFullUser,
    'refreshVerificationCode expected potential or full user'
  )
  return { _user: _updated }
}

export const clearVerificationCode = async (
  _user: _PotentialUser | _FullUser,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser | _FullUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      clearVerificationCode(_user, client)
    )
  }

  const _updated = await client.user.update({
    where: { id: _user.id },
    data: { verificationCode: null, verificationCodeExpiresAt: null },
  })
  invariantType(
    _updated,
    _isValidUser,
    'clearVerificationCode expected valid user'
  )
  invariantType(
    _updated,
    _isPotentialOrFullUser,
    'clearVerificationCode expected potential or full user'
  )
  return { _user: _updated }
}

export const verifyUserWithVerificationCode = async (
  { _user, code }: { _user: _PotentialUser | _FullUser; code: string },
  client: PartialClient = prisma
): Promise<{ _user: _FullUser | _PotentialUser; _verified: boolean }> => {
  if (client === prisma) {
    return prisma.$transaction((client) =>
      verifyUserWithVerificationCode({ _user, code }, client)
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
    invariantType(
      _updated,
      _isValidUser,
      'verifyUserWithVerificationCode expected valid user'
    )
    invariantType(
      _updated,
      _isPotentialOrFullUser,
      'verifyUserWithVerificationCode expected potential or full user'
    )
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
    invariantType(
      _updated,
      _isValidUser,
      'verifyUserWithVerificationCode expected valid user'
    )
    invariantType(
      _updated,
      _isPotentialOrFullUser,
      'verifyUserWithVerificationCode expected potential or full user'
    )
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
  invariantType(
    _updated,
    _isValidUser,
    'verifyUserWithVerificationCode expected valid user'
  )
  invariantType(
    _updated,
    _isPotentialOrFullUser,
    'verifyUserWithVerificationCode expected potential or full user'
  )
  _verified = true
  return { _user: _updated, _verified }
}

export const createAnonymousUser = async (
  client: PartialClient = prisma
): Promise<{ _user: _AnonymousUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) => createAnonymousUser(client))
  }
  const { _user } = await _createUserFromValidCreateInput(
    {
      backupCode: generateBackupCode(),
    },
    client
  )
  invariantType(_user, _isValidUser, 'createAnonymousUser expected valid user')
  invariantType(
    _user,
    _isAnonymousUser,
    'createAnonymousUser expected anonymous user'
  )
  return { _user }
}

export const createPotentialUser = async (
  { email, username }: CreatePotentialUserData,
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      createPotentialUser({ email, username }, client)
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
  invariantType(_user, _isValidUser, 'createPotentialUser expected valid user')
  invariantType(
    _user,
    _isPotentialUser,
    'createPotentialUser expected potential user'
  )
  return { _user }
}

export const createPotentialUserFromAnonymousUser = async (
  {
    _user,
    email,
    username,
  }: { _user: _AnonymousUser; email: string; username: string },
  client: PartialClient = prisma
): Promise<{ _user: _PotentialUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      createPotentialUserFromAnonymousUser({ _user, email, username }, client)
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
  invariantType(
    _updated,
    _isValidUser,
    'createPotentialUserFromAnonymousUser expected valid user'
  )
  invariantType(
    _updated,
    _isPotentialUser,
    'createPotentialUserFromAnonymousUser expected potential user'
  )
  return { _user: _updated }
}

export const revertPotentialUserToAnonymousUser = async (
  _user: _PotentialUser,
  client: PartialClient = prisma
): Promise<{ _user: _AnonymousUser }> => {
  if (client === prisma) {
    return prisma.$transaction(async (client) =>
      revertPotentialUserToAnonymousUser(_user, client)
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
  invariantType(
    _updated,
    _isValidUser,
    'revertPotentialUserToAnonymousUser expected valid user'
  )
  invariantType(
    _updated,
    _isAnonymousUser,
    'revertPotentialUserToAnonymousUser expected anonymous user'
  )
  return { _user: _updated }
}
