import * as crypto from 'node:crypto'

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long'

export interface SignedSession {
  data: {
    userId: number
    username: string
    email?: string
    isAdmin: boolean
    loggedInAt: string
  }
  signature: string
}

export function signSession(sessionData: Omit<SignedSession['data'], 'loggedInAt'>): string {
  const session: SignedSession = {
    data: {
      ...sessionData,
      loggedInAt: new Date().toISOString(),
    },
    signature: '',
  }

  const payload = JSON.stringify(session.data)
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64')

  session.signature = signature

  return Buffer.from(JSON.stringify(session)).toString('base64')
}

export function verifySignedSession(sessionString: string): SignedSession['data'] | null {
  try {
    const decoded = JSON.parse(Buffer.from(sessionString, 'base64').toString()) as SignedSession

    if (!decoded.data || !decoded.signature) {
      return null
    }

    const payload = JSON.stringify(decoded.data)
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64')

    if (!crypto.timingSafeEqual(Buffer.from(decoded.signature), Buffer.from(expectedSignature))) {
      return null
    }

    return decoded.data
  } catch {
    return null
  }
}
