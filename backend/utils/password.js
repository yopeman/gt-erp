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

export default {
  hashPassword,
  comparePassword
};

