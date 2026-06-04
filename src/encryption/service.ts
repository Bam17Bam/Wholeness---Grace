import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encryption service for HIPAA-compliant field-level encryption.
 * Uses AES-256-GCM (authenticated encryption) which provides
 * both confidentiality and integrity verification.
 */
export class EncryptionService {
  private key: Buffer;

  constructor(keyHex: string) {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new Error(
        `Invalid encryption key length: ${key.length} bytes. Expected 32 bytes (64 hex chars).`
      );
    }
    this.key = key;
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Returns a colon-delimited string: iv:authTag:ciphertext
   * All components are hex-encoded.
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt a string previously encrypted with `encrypt()`.
   * Verifies the GCM authentication tag to detect tampering.
   */
  decrypt(encryptedString: string): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted string format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Returns true if the string appears to be encrypted
   * (matches the iv:authTag:ciphertext format).
   */
  isEncrypted(value: string): boolean {
    return /^[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/.test(value);
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const { config } = require('../config');
    encryptionService = new EncryptionService(config.dataEncryptionKey);
  }
  return encryptionService;
}

export { EncryptionService as default };
