import { defineEventHandler, readBody, createError, setCookie } from 'h3';
import { 
  getUserByUsernameWithPassword, 
  getUserByEmailWithPassword,
  comparePassword 
} from '~/server/db/queries/users.ts';

// Session config
const SESSION_CONFIG = {
  name: 'blue-session',
  password: process.env.SESSION_SECRET || 'your-session-secret-minimum-32-characters-long',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, email, password } = body;

  // Validate input
  if ((!username && !email) || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username/email and password are required'
    });
  }

  try {
    // Find user by username or email
    let user;
    if (email) {
      user = await getUserByEmailWithPassword(email);
    }
    if (!user && username) {
      user = await getUserByUsernameWithPassword(username);
    }

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      });
    }

    // Create session
    const session = {
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      loggedInAt: new Date().toISOString()
    };

    // Set session cookie using simple cookie approach
    const sessionString = Buffer.from(JSON.stringify(session)).toString('base64');
    setCookie(event, 'blue-session', sessionString, SESSION_CONFIG);

    // Return user info (without password)
    return {
      statusCode: 200,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    };

  } catch (error) {
    console.error('Login error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Login failed'
    });
  }
});
