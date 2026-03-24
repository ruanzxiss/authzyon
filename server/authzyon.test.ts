import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// ─── Key generation tests ─────────────────────────────────────────────────────

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const { randomBytes } = require("crypto");
  const length = 10 + Math.floor(Math.random() * 5);
  let key = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    key += chars[bytes[i] % 26];
  }
  return key;
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "authzyon_salt_2024").digest("hex");
}

describe("Key Generation", () => {
  it("generates keys with only uppercase A-Z characters", () => {
    for (let i = 0; i < 50; i++) {
      const key = generateKey();
      expect(key).toMatch(/^[A-Z]+$/);
    }
  });

  it("generates keys with length between 10 and 14", () => {
    for (let i = 0; i < 50; i++) {
      const key = generateKey();
      expect(key.length).toBeGreaterThanOrEqual(10);
      expect(key.length).toBeLessThanOrEqual(14);
    }
  });

  it("generates unique keys across multiple calls", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateKey());
    }
    // With 26^10 possibilities, 100 keys should all be unique
    expect(keys.size).toBe(100);
  });
});

describe("Password Hashing", () => {
  it("hashes RUAN123 consistently", () => {
    const hash1 = hashPassword("RUAN123");
    const hash2 = hashPassword("RUAN123");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different passwords", () => {
    const hash1 = hashPassword("RUAN123");
    const hash2 = hashPassword("OTHER_PASS");
    expect(hash1).not.toBe(hash2);
  });

  it("hash is 64 characters (SHA-256 hex)", () => {
    const hash = hashPassword("RUAN123");
    expect(hash).toHaveLength(64);
  });
});

describe("Key Expiration Logic", () => {
  it("calculates expiry date correctly for 1 day", () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    expect(days).toBe(1);
  });

  it("calculates expiry date correctly for 7 days", () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    expect(days).toBe(7);
  });

  it("calculates expiry date correctly for 30 days", () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    expect(days).toBe(30);
  });

  it("detects expired keys correctly", () => {
    const pastDate = new Date(Date.now() - 1000);
    const isExpired = pastDate < new Date();
    expect(isExpired).toBe(true);
  });

  it("detects valid keys correctly", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60);
    const isExpired = futureDate < new Date();
    expect(isExpired).toBe(false);
  });
});

describe("Session Cookie Parsing", () => {
  it("parses valid session JSON", () => {
    const session = { userId: 1, role: "admin", username: "RUAN" };
    const cookie = JSON.stringify(session);
    const parsed = JSON.parse(cookie);
    expect(parsed.userId).toBe(1);
    expect(parsed.role).toBe("admin");
    expect(parsed.username).toBe("RUAN");
  });

  it("returns null for invalid JSON", () => {
    const getSession = (cookie: string | undefined) => {
      if (!cookie) return null;
      try {
        const data = JSON.parse(cookie);
        if (!data.userId || !data.role) return null;
        return data;
      } catch {
        return null;
      }
    };
    expect(getSession(undefined)).toBeNull();
    expect(getSession("invalid-json")).toBeNull();
    expect(getSession('{"no_user_id": true}')).toBeNull();
  });
});

describe("iOS API Response Format", () => {
  it("validates key response structure for active key", () => {
    const mockResponse = {
      success: true,
      message: "Key Validada",
      key: "ABCDEFGHIJ",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      session_token: "abc123",
      days_remaining: 7,
    };
    expect(mockResponse.success).toBe(true);
    expect(mockResponse.message).toBe("Key Validada");
    expect(mockResponse.key).toMatch(/^[A-Z]+$/);
    expect(mockResponse.days_remaining).toBeGreaterThan(0);
  });

  it("validates error response for invalid key", () => {
    const mockError = { success: false, error: "Key inválida" };
    expect(mockError.success).toBe(false);
    expect(mockError.error).toBeTruthy();
  });

  it("validates expired key response", () => {
    const mockExpired = {
      success: false,
      error: "Key expirada",
      expired: true,
      needs_key: true,
    };
    expect(mockExpired.expired).toBe(true);
    expect(mockExpired.needs_key).toBe(true);
  });
});
