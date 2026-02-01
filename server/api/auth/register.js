import { defineEventHandler, readBody, createError } from 'h3';
import { 
  createUser, 
  getUserByUsername, 
  getUserByEmailWithPassword
} from '~/server/db/queries/users.js';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, email, password } = body;

  // Validate input
  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username and password are required'
    });
  }

  // Password strength validation
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 8 characters'
    });
  }

  try {
    // Check if this is the first user (make them admin)
    const { pool } = await import('~/server/db/index.js');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;
    console.log(`Registration attempt: isFirstUser=${isFirstUser}, userCount=${userCount.rows[0].count}`);

    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await getUserByEmailWithPassword(email);
      if (existingEmail) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Email already exists'
        });
      }
    }

    // Create user
    const user = await createUser(username, email, password);
    if (!user) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create user'
      });
    }

    // If first user, make them admin
    if (isFirstUser) {
      await pool.query(
        'UPDATE users SET is_admin = true WHERE id = $1',
        [user.id]
      );
      user.is_admin = true;
      console.log(`First user ${username} created as admin`);
    }

    return {
      statusCode: 201,
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin || false
      }
    };

  } catch (error) {
    console.error('Registration error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Registration failed'
    });
  }
});
