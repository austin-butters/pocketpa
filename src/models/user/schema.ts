import { baseSchema } from '#models/base'
import { JSONSchema7 } from 'jsonschema7'

export const byUserId = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
    },
  },
  required: ['userId'],
  additionalProperties: false,
} satisfies JSONSchema7

export const createUserData = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
  },
  required: ['email'],
  additionalProperties: false,
} satisfies JSONSchema7

export const user = {
  type: 'object',
  properties: {
    ...baseSchema.model.properties,
    ...createUserData.properties,
    emailVerified: {
      type: 'boolean',
    },
  },
  required: [
    ...baseSchema.model.required,
    ...createUserData.required,
    'emailVerified',
  ],
  additionalProperties: false,
} satisfies JSONSchema7

export const POST = {
  body: createUserData,
  response: {
    201: user,
  },
}

export const GET = {
  params: byUserId,
  response: {
    200: user,
  },
}

export const DELETE = {
  params: byUserId,
}
