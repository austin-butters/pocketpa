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
      required: ['sessionExists', 'user'],
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

export const POSTLoginAnonymous = {
  body: {
    type: 'object',
    properties: {
      backupCode: {
        type: 'string',
      },
    },
    required: ['backupCode'],
    additionalProperties: false,
  } satisfies JSONSchema7,
  response: {
    200: {
      type: 'object',
      properties: {
        user: userSchema.user,
      },
      required: ['user'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const

export const POSTLogin = {
  body: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
      },
    },
    required: ['email'],
    additionalProperties: false,
  } satisfies JSONSchema7,
} as const

export const POSTVerifyLogin = {
  body: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
      },
      verificationCode: {
        type: 'string',
      },
    },
    required: ['email', 'verificationCode'],
  } satisfies JSONSchema7,
  response: {
    200: {
      type: 'object',
      properties: {
        user: {
          anyOf: [userSchema.user, { type: 'null' }],
        },
        verified: {
          type: 'boolean',
        },
      },
      required: ['user', 'verified'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const

export const POSTResendVerificationCode = {
  body: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
      },
    },
    required: ['email'],
    additionalProperties: false,
  } satisfies JSONSchema7,
  response: {
    200: {
      type: 'object',
      properties: {
        resent: {
          type: 'boolean',
        },
      },
      required: ['resent'],
      additionalProperties: false,
    } satisfies JSONSchema7,
  },
} as const
