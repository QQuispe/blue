export interface User {
  id: number
  username: string
  email?: string
  password_hash?: string
  is_active: boolean
  is_admin: boolean
  created_at: Date
  updated_at: Date
}

export interface UserSession {
  id: number
  user_id: number
  token: string
  expires_at: Date
  created_at: Date
  updated_at?: Date
}
