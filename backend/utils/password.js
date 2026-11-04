import crypto from 'crypto';

/**
 * Hash a password using scrypt with random salt
 * Format stored: salt:hash
 * @param {string} plainPassword 
 * @returns {string}
 */
export const hashPassword = (plainPassword) => {
  if (!plainPassword) {
    throw new Error('Password cannot be empty');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
};

/**
 * Compare plain password with stored salt:hash
 * @param {string} plainPassword 
 * @param {string} storedHash 
 * @returns {boolean}
 */
export const comparePassword = (plainPassword, storedHash) => {
  if (!plainPassword || !storedHash) {
    return false;
  }

  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64);

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
};

/**
 * Generate a secure, user-friendly temporary password
 * Default shape: Gt@ + 6 alphanumeric characters (e.g. Gt@K9mX2b)
 */
export const generateTemporaryPassword = (prefix = 'Gt@', length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let randomPart = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    randomPart += chars[randomBytes[i] % chars.length];
  }
  return `${prefix}${randomPart}`;
};

export default {
  hashPassword,
  comparePassword,
  generateTemporaryPassword
};
