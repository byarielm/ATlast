import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { ApiError } from "../errors";

/**
 * Token Encryption Service
 * Encrypts sensitive OAuth tokens at rest using AES-256-GCM
 */

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  if (!key) {
    throw new ApiError(
      "Encryption key not configured",
      500,
      "TOKEN_ENCRYPTION_KEY environment variable is required",
    );
  }

  // Expect 64-char hex string (32 bytes)
  if (key.length !== 64) {
    throw new ApiError(
      "Invalid encryption key",
      500,
      "TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    );
  }

  return Buffer.from(key, "hex");
}

interface EncryptedPayload {
  iv: string;
  data: string;
  tag: string;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param data - Data to encrypt (will be JSON stringified)
 * @returns Encrypted payload as JSON string
 */
export function encryptToken(data: any): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const jsonData = JSON.stringify(data);
    const encrypted = Buffer.concat([
      cipher.update(jsonData, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
      iv: iv.toString("hex"),
      data: encrypted.toString("hex"),
      tag: authTag.toString("hex"),
    };

    return JSON.stringify(payload);
  } catch (error) {
    console.error("Token encryption failed:", error);
    throw new ApiError(
      "Failed to encrypt token",
      500,
      error instanceof Error ? error.message : "Unknown encryption error",
    );
  }
}

/**
 * Decrypt sensitive data
 * @param encrypted - Encrypted payload as JSON string
 * @returns Decrypted data
 */
export function decryptToken(encrypted: string): any {
  try {
    const key = getEncryptionKey();
    const payload: EncryptedPayload = JSON.parse(encrypted);

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(payload.iv, "hex"),
    );

    decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, "hex")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch (error) {
    console.error("Token decryption failed:", error);
    throw new ApiError(
      "Failed to decrypt token",
      500,
      error instanceof Error ? error.message : "Unknown decryption error",
    );
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * Run this once and store in environment variables
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Check if encryption is properly configured
 * Returns false in development if key is missing (with warning)
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        "Encryption key not configured in production",
        500,
        "TOKEN_ENCRYPTION_KEY is required in production",
      );
    }
    console.warn(
      "⚠️  TOKEN_ENCRYPTION_KEY not set - tokens will NOT be encrypted",
    );
    return false;
  }

  return true;
}
