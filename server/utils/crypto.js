import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Derive a key from the encryption key and salt using PBKDF2
 */
function deriveKey(key, salt) {
  return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
}

/**
 * Get raw encryption key from environment
 */
function getRawKey() {
  return process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns base64 encoded string with salt, IV, and auth tag
 */
export function encrypt(text) {
  if (!text) return null;

  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(getRawKey(), salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine salt + IV + authTag + encrypted data
    const result = salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return Buffer.from(result).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string using AES-256-GCM
 * Expects base64 encoded string with salt, IV, and auth tag
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;

  try {
    const decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
    const parts = decoded.split(':');

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const key = deriveKey(getRawKey(), salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a string (one-way, for comparison)
 */
export function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
