import { defineEventHandler, createError, setCookie } from 'h3';
import { getUserByUsername } from '~/server/db/queries/users.ts';

interface GuestLoginResponse {
  statusCode: number;
  message: string;
  user: {
    id: number;
    username: string;
    email?: string;
    isAdmin: boolean;
  };
}

interface SessionData {
  userId: number;
  username: string;
  email?: string;
  isAdmin: boolean;
  loggedInAt: string;
}

const SESSION_CONFIG = {
  name: 'blue-session',
  password: process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

// Check if we're in dev mode
const isDevMode = (): boolean => process.env.DEV_MODE === 'true';

export default defineEventHandler(async (event): Promise<GuestLoginResponse> => {
  // Only allow guest login in dev mode
  if (!isDevMode()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Guest login only available in development mode'
    });
  }

  try {
    // Find or create guest user
    let guestUser = await getUserByUsername('guest');
    
    if (!guestUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Guest user not found. Please visit setup endpoint first.'
      });
    }

    // Create session for guest user
    const session: SessionData = {
      userId: guestUser.id,
      username: guestUser.username,
      email: guestUser.email,
      isAdmin: guestUser.is_admin,
      loggedInAt: new Date().toISOString()
    };

    const sessionString = Buffer.from(JSON.stringify(session)).toString('base64');
    setCookie(event, 'blue-session', sessionString, SESSION_CONFIG);

    return {
      statusCode: 200,
      message: 'Logged in as guest',
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        isAdmin: guestUser.is_admin
      }
    };

  } catch (error: any) {
    console.error('Guest login error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Guest login failed'
    });
  }
});