import { defineEventHandler, createError, deleteCookie, getMethod } from 'h3';

interface LogoutResponse {
  statusCode: number;
  message: string;
}

export default defineEventHandler(async (event): Promise<LogoutResponse> => {
  // Only allow POST requests for logout
  const method = getMethod(event);
  if (method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed. Use POST for logout.'
    });
  }

  try {
    // Clear the session cookie
    deleteCookie(event, 'blue-session');

    return {
      statusCode: 200,
      message: 'Logout successful'
    };
  } catch (error) {
    console.error('Logout error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Logout failed'
    });
  }
});