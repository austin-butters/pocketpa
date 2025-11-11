import { baseSchema } from '#models/base'
import { type JSONSchema7 } from 'jsonschema7'

export const createPotentialUserData = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
    },
    username: {
      type: 'string',
    },
  },
  required: ['email', 'username'],
  additionalProperties: false,
} satisfies JSONSchema7

export const user = {
  type: 'object',
  properties: {
    ...baseSchema.model.properties,
    email: {
      type: ['string', 'null'],
    },
    username: {
      type: ['string', 'null'],
    },
    emailVerified: {
      type: 'boolean',
    },
  },
  required: [
    ...baseSchema.model.required,
    'email',
    'username',
    'emailVerified',
  ],
  additionalProperties: false,
} satisfies JSONSchema7
