import { defineEventHandler, createError, getCookie } from 'h3';
import { getUserById } from '~/server/db/queries/users.ts';

interface MeResponse {
  statusCode: number;
  message?: string;
  user: {
    id: number;
    username: string;
    email?: string;
    isAdmin: boolean;
  } | null;
}

interface SessionData {
  userId: number;
  username: string;
  email?: string;
  isAdmin: boolean;
  loggedInAt: string;
}

export default defineEventHandler(async (event): Promise<MeResponse> => {
  try {
    // Get session from cookie
    const sessionCookie = getCookie(event, 'blue-session');
    
    if (!sessionCookie) {
      return {
        statusCode: 401,
        message: 'Not authenticated',
        user: null
      };
    }

    // Parse session
    let session: SessionData;
    try {
      session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch {
      return {
        statusCode: 401,
        message: 'Invalid session',
        user: null
      };
    }

    if (!session.userId) {
      return {
        statusCode: 401,
        message: 'Not authenticated',
        user: null
      };
    }

    // Fetch fresh user data from database
    const user = await getUserById(session.userId);
    
    if (!user || !user.is_active) {
      return {
        statusCode: 401,
        message: 'User not found or deactivated',
        user: null
      };
    }

    return {
      statusCode: 200,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    };

  } catch (error) {
    console.error('Get current user error:', error);
    return {
      statusCode: 500,
      message: 'Failed to get current user',
      user: null
    };
  }
});