import { pool } from '../index.js';
import crypto from 'crypto';
import type { User, QueryResult, QueryResultArray } from '~/types';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

// Invite code type based on database schema
interface InviteCode {
  id: number;
  code: string;
  is_used: boolean;
  created_at: Date;
  created_by?: number;
  used_by?: number;
  used_at?: Date;
  created_by_username?: string;
  used_by_username?: string;
}

/**
 * Hash a password using PBKDF2 (Node native)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  
  const computedHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return computedHash === hash;
}

/**
 * Create a new user with password
 */
export async function createUser(
  username: string, 
  email: string | null, 
  password: string | null
): Promise<QueryResult<Partial<User>>> {
  const passwordHash = password ? await hashPassword(password) : null;
  
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (username) DO NOTHING 
     RETURNING id, username, email, created_at`,
    [username, email, passwordHash]
  );
  return result.rows[0];
}

/**
 * Get user by ID (without password hash)
 */
export async function getUserById(id: number): Promise<QueryResult<User>> {
  const result = await pool.query(
    `SELECT id, username, email, is_active, is_admin, created_at, updated_at 
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get user by ID with password (for auth)
 */
export async function getUserByIdWithPassword(id: number): Promise<QueryResult<User>> {
  const result = await pool.query(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get user by username (without password hash)
 */
export async function getUserByUsername(username: string): Promise<QueryResult<User>> {
  const result = await pool.query(
    `SELECT id, username, email, is_active, is_admin, created_at, updated_at 
     FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Get user by username with password (for login)
 */
export async function getUserByUsernameWithPassword(username: string): Promise<QueryResult<User>> {
  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Get user by email with password (for login)
 */
export async function getUserByEmailWithPassword(email: string): Promise<QueryResult<User>> {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Update user's password
 */
export async function updateUserPassword(
  userId: number, 
  newPassword: string
): Promise<QueryResult<Partial<User>>> {
  const passwordHash = await hashPassword(newPassword);
  
  const result = await pool.query(
    `UPDATE users 
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, username, email, updated_at`,
    [passwordHash, userId]
  );
  return result.rows[0] || null;
}

/**
 * Get or create default user (for Phase 1 migration/legacy support)
 * Uses atomic INSERT ... ON CONFLICT to handle race conditions
 */
export async function getOrCreateDefaultUser(): Promise<QueryResult<Partial<User>>> {
  const username = 'default_user';
  
  // Try to create the user (will return null if already exists due to ON CONFLICT)
  let user = await createUser(username, null, null);
  
  if (user) {
    console.log('Created default user:', user.id);
  } else {
    // User already exists, fetch it
    user = await getUserByUsername(username);
  }
  
  return user;
}

/**
 * Create an invite code
 */
export async function createInviteCode(
  code: string, 
  createdBy: number
): Promise<InviteCode> {
  const result = await pool.query(
    `INSERT INTO invite_codes (code, created_by) 
     VALUES ($1, $2) 
     RETURNING id, code, is_used, created_at`,
    [code, createdBy]
  );
  return result.rows[0];
}

/**
 * Get invite code by code string
 */
export async function getInviteCode(code: string): Promise<QueryResult<InviteCode>> {
  const result = await pool.query(
    `SELECT * FROM invite_codes WHERE code = $1 AND is_used = false`,
    [code]
  );
  return result.rows[0] || null;
}

/**
 * Mark invite code as used
 */
export async function useInviteCode(
  codeId: number, 
  usedBy: number
): Promise<QueryResult<Partial<InviteCode>>> {
  const result = await pool.query(
    `UPDATE invite_codes 
     SET is_used = true, used_by = $1, used_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, code, is_used, used_at`,
    [usedBy, codeId]
  );
  return result.rows[0] || null;
}

/**
 * List all invite codes (for admin)
 */
export async function listInviteCodes(): Promise<QueryResultArray<InviteCode>> {
  const result = await pool.query(
    `SELECT ic.*, 
            creator.username as created_by_username,
            user.username as used_by_username
     FROM invite_codes ic
     LEFT JOIN users creator ON ic.created_by = creator.id
     LEFT JOIN users user ON ic.used_by = user.id
     ORDER BY ic.created_at DESC`
  );
  return result.rows;
}
