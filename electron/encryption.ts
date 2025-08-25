// Node.js compatible encryption utilities using crypto module
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Derive a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data with AES-256-GCM
 */
export async function encrypt(data: string, password: string): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create cipher - Node.js crypto.createCipher is deprecated, use createCipheriv
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt + IV + tag + encrypted data
    const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
    
    return result.toString('base64');
  } catch (error) {
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt data with AES-256-GCM
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  try {
    // Decode base64
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create decipher - Node.js crypto.createDecipher is deprecated, use createDecipheriv
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('Decryption failed');
  }
}
