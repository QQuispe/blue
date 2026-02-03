import { getUserById } from '~/server/db/queries/users.ts';
import { createError, getCookie } from 'h3';

/**
 * Require authentication for a route
 * Returns the user object or throws an error
 */
export async function requireAuth(event) {
  const sessionCookie = getCookie(event, 'blue-session');
  
  if (!sessionCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    });
  }

  // Parse session
  let session;
  try {
    session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session'
    });
  }

  if (!session.userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    });
  }

  // Get fresh user data
  const user = await getUserById(session.userId);
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not found'
    });
  }

  if (!user.is_active) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Account is deactivated'
    });
  }

  return user;
}

/**
 * Optional auth - returns user if logged in, null otherwise
 * Does not throw error if not authenticated
 */
export async function getAuthUser(event) {
  try {
    const sessionCookie = getCookie(event, 'blue-session');
    
    if (!sessionCookie) {
      return null;
    }

    // Parse session
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch {
      return null;
    }

    if (!session.userId) {
      return null;
    }

    const user = await getUserById(session.userId);
    
    if (!user || !user.is_active) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}
