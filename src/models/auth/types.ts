import { type CreatePotentialUserData } from '#models/user'

export interface AuthPOSTCheckAvailability {
  Body: CreatePotentialUserData
}

export interface AuthPOSTCheckAvailabilityResponse {
  emailAvailable: boolean | null
  usernameAvailable: boolean | null
}

export interface AuthPOSTRegisterPotential {
  Body: CreatePotentialUserData
}

export interface AuthPOSTLoginAnonymous {
  Body: {
    backupCode: string
  }
}

export interface AuthPOSTLogin {
  Body: {
    email: string
  }
}

export interface AuthPOSTVerifyLogin {
  Body: {
    email: string
    verificationCode: string
  }
}

export interface AuthPOSTVerifyEmail {
  Body: {
    email: string
    verificationCode: string
  }
}

export interface AuthPOSTResendVerificationCode {
  Body: {
    email: string
  }
}
