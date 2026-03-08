import { H3Event, setCookie, deleteCookie } from 'h3'
import { signSession, verifySignedSession } from '~/server/utils/session'
import type { SignedSession } from '~/server/utils/session'
import type { AuthUser, AuthError } from '~/types/api/auth'

const SESSION_CONFIG = {
  name: 'blue-session',
  password: process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  httpOnly: true,
  secure: process.env.HTTPS_ENABLED === 'true',
  sameSite: 'lax' as const,
  path: '/',
}

export interface SessionUser {
  id: number
  username: string
  email?: string
  isAdmin: boolean
}

/**
 * Create and store a signed session cookie
 */
export function createUserSession(event: H3Event, user: SessionUser): string {
  const sessionString = signSession({
    userId: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
  })

  setCookie(event, SESSION_CONFIG.name, sessionString, SESSION_CONFIG)
  return sessionString
}

/**
 * Clear the session cookie
 */
export function clearUserSession(event: H3Event): void {
  deleteCookie(event, SESSION_CONFIG.name)
}

/**
 * Verify and return session data from cookie
 */
export function getSessionFromCookie(event: H3Event): SignedSession['data'] | null {
  const sessionCookie = getCookie(event, SESSION_CONFIG.name)
  if (!sessionCookie) return null
  return verifySignedSession(sessionCookie)
}

/**
 * Check if currently in dev mode
 */
export function isDevMode(): boolean {
  return process.env.DEV_MODE === 'true'
}

import { getCookie } from 'h3'
