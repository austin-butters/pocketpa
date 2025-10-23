import { BaseTypes } from '#models/base'

export interface ByUserId {
  userId: string
}

export interface CreateUserData {
  email: string
}

export interface User extends CreateUserData, BaseTypes.Model {
  emailVerified: boolean
}

export interface POST {
  Body: CreateUserData
}

export interface GET {
  Params: ByUserId
}

export interface DELETE {
  Params: ByUserId
}
