import type { ApiSuccess, ApiError } from './common'

// User Settings
export interface UserSettings {
  currency: string
  locale: string
  timezone: string
  theme: 'light' | 'dark' | 'auto'
  notificationsEnabled: boolean
  budgetAlertsEnabled: boolean
}

export interface UpdateSettingsRequest {
  currency?: string
  locale?: string
  timezone?: string
  theme?: 'light' | 'dark' | 'auto'
  notificationsEnabled?: boolean
  budgetAlertsEnabled?: boolean
}

// Password
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// Username
export interface ChangeUsernameRequest {
  newUsername: string
}

// API Response Types
export interface SettingsResponse extends ApiSuccess<{ settings: UserSettings }> {}
export interface UpdateSettingsResponse extends ApiSuccess<{ settings: UserSettings }> {}
export interface ChangePasswordResponse extends ApiSuccess<{ message: string }> {}
export interface ChangeUsernameResponse extends ApiSuccess<{
  user: { id: number; username: string }
  message: string
}> {}
export interface DeleteAccountResponse extends ApiSuccess<{ message: string }> {}

export type UserError = ApiError
