import { describe, it, expect, vi } from "vitest";
import type { Context } from "hono";
import {
  SessionSecurityService,
  createSecureSessionData,
} from "./session-security";
import type { SessionFingerprint } from "./session-security";

/**
 * Creates a minimal mock Hono Context with configurable request headers.
 */
function createMockContext(
  headers: Record<string, string> = {},
): Context {
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
    },
  } as Context;
}

describe("SessionSecurityService", () => {
  describe("generateFingerprint", () => {
    it("extracts user-agent from request headers", () => {
      const c = createMockContext({
        "user-agent": "Mozilla/5.0 TestBrowser",
      });

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.userAgent).toBe("Mozilla/5.0 TestBrowser");
    });

    it("uses 'unknown' when user-agent is missing", () => {
      const c = createMockContext({});

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.userAgent).toBe("unknown");
    });

    it("extracts IP from x-forwarded-for (first entry)", () => {
      const c = createMockContext({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1",
      });

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.ipAddress).toBe("192.168.1.1");
    });

    it("falls back to client-ip when x-forwarded-for is missing", () => {
      const c = createMockContext({
        "client-ip": "10.0.0.5",
      });

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.ipAddress).toBe("10.0.0.5");
    });

    it("uses 'unknown' when no IP headers are present", () => {
      const c = createMockContext({});

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.ipAddress).toBe("unknown");
    });

    it("includes createdAt timestamp", () => {
      const before = Date.now();
      const c = createMockContext({ "user-agent": "test" });

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.createdAt).toBeGreaterThanOrEqual(before);
      expect(fingerprint.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it("trims whitespace from x-forwarded-for IP", () => {
      const c = createMockContext({
        "x-forwarded-for": "  192.168.1.1  , 10.0.0.1",
      });

      const fingerprint = SessionSecurityService.generateFingerprint(c);

      expect(fingerprint.ipAddress).toBe("192.168.1.1");
    });
  });

  describe("verifyFingerprint", () => {
    const baseFingerprint: SessionFingerprint = {
      userAgent: "Mozilla/5.0 TestBrowser",
      ipAddress: "192.168.1.1",
      createdAt: Date.now(),
    };

    it("returns true when fingerprints match exactly", () => {
      const current: SessionFingerprint = { ...baseFingerprint };
      expect(
        SessionSecurityService.verifyFingerprint(baseFingerprint, current),
      ).toBe(true);
    });

    it("returns false when user-agent changes", () => {
      const current: SessionFingerprint = {
        ...baseFingerprint,
        userAgent: "DifferentBrowser/1.0",
      };

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = SessionSecurityService.verifyFingerprint(
        baseFingerprint,
        current,
      );

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("User-Agent changed"),
      );
      warnSpy.mockRestore();
    });

    it("returns true when IP changes (logs but doesnt fail)", () => {
      const current: SessionFingerprint = {
        ...baseFingerprint,
        ipAddress: "10.0.0.99",
      };

      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const result = SessionSecurityService.verifyFingerprint(
        baseFingerprint,
        current,
      );

      expect(result).toBe(true);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Session IP changed"),
      );
      infoSpy.mockRestore();
    });

    it("returns true when createdAt differs (not compared)", () => {
      const current: SessionFingerprint = {
        ...baseFingerprint,
        createdAt: baseFingerprint.createdAt + 100000,
      };

      expect(
        SessionSecurityService.verifyFingerprint(baseFingerprint, current),
      ).toBe(true);
    });
  });
});

describe("createSecureSessionData", () => {
  it("returns object with did and fingerprint", () => {
    const c = createMockContext({
      "user-agent": "TestAgent/1.0",
      "x-forwarded-for": "192.168.1.1",
    });

    const result = createSecureSessionData(c, "did:plc:test123");

    expect(result.did).toBe("did:plc:test123");
    expect(result.fingerprint).toBeDefined();
    expect(result.fingerprint.userAgent).toBe("TestAgent/1.0");
    expect(result.fingerprint.ipAddress).toBe("192.168.1.1");
    expect(typeof result.fingerprint.createdAt).toBe("number");
  });

  it("generates fingerprint from the provided context", () => {
    const c = createMockContext({
      "user-agent": "Custom/2.0",
      "client-ip": "10.10.10.10",
    });

    const result = createSecureSessionData(c, "did:web:example.com");

    expect(result.did).toBe("did:web:example.com");
    expect(result.fingerprint.ipAddress).toBe("10.10.10.10");
  });
});
