import { defineEventHandler, createError, deleteCookie } from 'h3';

export default defineEventHandler(async (event) => {
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
