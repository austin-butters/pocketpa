import { Model } from '#models/base'

export interface CreatePotentialUserData {
  email: string
  username: string
}

export interface User extends Model {
  email: string | null
  username: string | null
  emailVerified: boolean
}
