import { userSchema } from '#models/user'
import { JSONSchema7 } from 'jsonschema7'

export const GETSessionStatus = {
  response: {
    200: {
      type: 'object',
      properties: {
        sessionExists: {
          type: 'boolean',
        },
        user: userSchema.user,
      },
      required: ['session', 'user'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const

export const POSTCheckAvailability = {
  body: userSchema.createPotentialUserData,
  response: {
    200: {
      type: 'object',
      properties: {
        emailAvailable: {
          type: 'boolean',
        },
        usernameAvailable: {
          type: 'boolean',
        },
      },
      required: ['emailAvailable', 'usernameAvailable'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const

export const POSTRegisterAnonymous = {
  response: {
    201: {
      type: 'object',
      properties: {
        user: userSchema.user,
      },
      required: ['user'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const

export const POSTRegisterPotential = {
  body: userSchema.createPotentialUserData,
  response: {
    201: {
      type: 'object',
      properties: {
        user: userSchema.user,
      },
      required: ['user'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const
