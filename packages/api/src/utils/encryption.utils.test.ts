import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  isEncryptionConfigured,
} from "./encryption.utils";
import { ApiError } from "../errors";

// A valid 64-char hex key (32 bytes) for testing
const TEST_KEY =
  "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

describe("Encryption Utils", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });

  describe("generateEncryptionKey", () => {
    it("generates a 64-character hex string", () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique keys each time", () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("encryptToken / decryptToken", () => {
    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    });

    it("encrypts and decrypts a string", () => {
      const data = "sensitive-data";
      const encrypted = encryptToken(data);
      const decrypted = decryptToken<string>(encrypted);
      expect(decrypted).toBe(data);
    });

    it("encrypts and decrypts an object", () => {
      const data = { did: "did:plc:test123", handle: "test.bsky.social" };
      const encrypted = encryptToken(data);
      const decrypted = decryptToken<typeof data>(encrypted);
      expect(decrypted).toEqual(data);
    });

    it("produces different ciphertext each time (random IV)", () => {
      const data = "same-data";
      const encrypted1 = encryptToken(data);
      const encrypted2 = encryptToken(data);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("encrypted output is valid JSON with iv, data, tag fields", () => {
      const encrypted = encryptToken("test");
      const payload = JSON.parse(encrypted);
      expect(payload).toHaveProperty("iv");
      expect(payload).toHaveProperty("data");
      expect(payload).toHaveProperty("tag");
      expect(typeof payload.iv).toBe("string");
      expect(typeof payload.data).toBe("string");
      expect(typeof payload.tag).toBe("string");
    });

    it("throws ApiError when decrypting tampered data", () => {
      const encrypted = encryptToken("test");
      const payload = JSON.parse(encrypted);
      // Tamper with encrypted data
      payload.data = "0000" + payload.data.slice(4);
      const tampered = JSON.stringify(payload);

      expect(() => decryptToken(tampered)).toThrow(ApiError);
    });

    it("throws ApiError when decrypting invalid JSON", () => {
      expect(() => decryptToken("not-json")).toThrow(ApiError);
    });

    it("throws ApiError when decrypting with missing fields", () => {
      expect(() => decryptToken(JSON.stringify({ iv: "aa" }))).toThrow(
        ApiError,
      );
    });

    it("handles null and undefined values", () => {
      const encryptedNull = encryptToken(null);
      expect(decryptToken(encryptedNull)).toBeNull();
    });

    it("handles arrays", () => {
      const data = [1, 2, 3];
      const encrypted = encryptToken(data);
      expect(decryptToken<number[]>(encrypted)).toEqual(data);
    });

    it("handles empty string", () => {
      const encrypted = encryptToken("");
      expect(decryptToken<string>(encrypted)).toBe("");
    });
  });

  describe("encryptToken / decryptToken - key errors", () => {
    it("throws ApiError when TOKEN_ENCRYPTION_KEY is not set", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      expect(() => encryptToken("data")).toThrow(ApiError);
      try {
        encryptToken("data");
        expect.fail("Should have thrown");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBe(500);
        expect(apiError.details).toContain("Encryption key not configured");
      }
    });

    it("throws ApiError when TOKEN_ENCRYPTION_KEY has wrong length", () => {
      process.env.TOKEN_ENCRYPTION_KEY = "tooshort";
      expect(() => encryptToken("data")).toThrow(ApiError);
      try {
        encryptToken("data");
        expect.fail("Should have thrown");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBe(500);
        expect(apiError.details).toContain("Invalid encryption key");
      }
    });
  });

  describe("isEncryptionConfigured", () => {
    it("returns true when key is set", () => {
      process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
      expect(isEncryptionConfigured()).toBe(true);
    });

    it("returns false when key is not set (non-production)", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";
      expect(isEncryptionConfigured()).toBe(false);
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("throws ApiError when key is not set in production", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        expect(() => isEncryptionConfigured()).toThrow(ApiError);
        expect(() => isEncryptionConfigured()).toThrow(
          "Encryption key not configured in production",
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
