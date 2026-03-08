import type { ApiSuccess, ApiError } from './common'

// Auth Request Types
export interface LoginBody {
  username?: string
  email?: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface GuestRequest {
  displayName: string
}

export interface SetupRequest {
  username: string
  password: string
}

// Auth Response Types
export interface AuthUser {
  id: number
  username: string
  email?: string
  isAdmin: boolean
  is_admin?: boolean
  is_active?: boolean
}

export interface LoginResponse extends ApiSuccess<{ user: AuthUser; message?: string }> {}
export interface RegisterResponse extends ApiSuccess<{ user: AuthUser; message: string }> {}
export interface GuestResponse extends ApiSuccess<{ user: AuthUser; message: string }> {}
export interface MeResponse extends ApiSuccess<{ user: AuthUser | null }> {}
export interface SetupResponse extends ApiSuccess<{
  user?: AuthUser
  message: string
  hasUsers: boolean
  devMode?: boolean
}> {}
export interface LogoutResponse extends ApiSuccess<{ success: boolean }> {}

export type AuthError = ApiError
