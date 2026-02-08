import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionService } from "./SessionService";
import { AuthenticationError } from "../errors";

// Mock the infrastructure dependencies
vi.mock("../infrastructure/oauth/OAuthClientFactory", () => ({
  createOAuthClient: vi.fn(),
}));

vi.mock("../infrastructure/oauth", () => ({
  userSessionStore: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
  sessionStore: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import mocked modules after vi.mock declarations
import { createOAuthClient } from "../infrastructure/oauth/OAuthClientFactory";
import { userSessionStore, sessionStore } from "../infrastructure/oauth";
import type { Context } from "hono";

const mockUserSessionStore = vi.mocked(userSessionStore);
const mockCreateOAuthClient = vi.mocked(createOAuthClient);
const mockSessionStore = vi.mocked(sessionStore);

/** Creates a minimal mock Hono Context */
function createMockContext(
  headers: Record<string, string> = {},
): Context {
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
    },
  } as Context;
}

describe("SessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifySession", () => {
    it("returns true for existing session", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:test" });

      const result = await SessionService.verifySession("valid-session-id");

      expect(result).toBe(true);
      expect(mockUserSessionStore.get).toHaveBeenCalledWith("valid-session-id");
    });

    it("returns false for non-existent session", async () => {
      mockUserSessionStore.get.mockResolvedValue(undefined);

      const result = await SessionService.verifySession("invalid-session");

      expect(result).toBe(false);
    });
  });

  describe("getDIDForSession", () => {
    it("returns DID for existing session", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:user123" });

      const result = await SessionService.getDIDForSession("session-id");

      expect(result).toBe("did:plc:user123");
    });

    it("returns null for non-existent session", async () => {
      mockUserSessionStore.get.mockResolvedValue(undefined);

      const result = await SessionService.getDIDForSession("bad-session");

      expect(result).toBeNull();
    });
  });

  describe("getAgentForSession", () => {
    const mockContext = createMockContext({ host: "localhost:8888" });

    it("throws AuthenticationError for invalid session", async () => {
      mockUserSessionStore.get.mockResolvedValue(undefined);

      await expect(
        SessionService.getAgentForSession("bad-session", mockContext),
      ).rejects.toThrow(AuthenticationError);
    });

    it("creates OAuth client and restores agent for valid session", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:test" });

      const mockOAuthSession = { did: "did:plc:test" };
      const mockClient = {
        restore: vi.fn().mockResolvedValue(mockOAuthSession),
      };
      mockCreateOAuthClient.mockResolvedValue(mockClient as never);
      mockSessionStore.get.mockResolvedValue({} as never);

      const result = await SessionService.getAgentForSession(
        "valid-session",
        mockContext,
      );

      expect(result.did).toBe("did:plc:test");
      expect(result.agent).toBeDefined();
      expect(result.client).toBe(mockClient);
      expect(mockClient.restore).toHaveBeenCalledWith("did:plc:test");
    });

    it("uses cached OAuth client within 5-minute window", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:test" });

      const mockOAuthSession = { did: "did:plc:test" };
      const mockClient = {
        restore: vi.fn().mockResolvedValue(mockOAuthSession),
      };
      mockCreateOAuthClient.mockResolvedValue(mockClient as never);
      mockSessionStore.get.mockResolvedValue({} as never);

      // First call - creates client
      await SessionService.getAgentForSession("cached-session", mockContext);
      // Second call - should use cached
      await SessionService.getAgentForSession("cached-session", mockContext);

      // createOAuthClient called only once (cached for second call)
      expect(mockCreateOAuthClient).toHaveBeenCalledTimes(1);
    });

    it("throws AuthenticationError when OAuth session restore fails", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:test" });

      const mockClient = {
        restore: vi.fn().mockRejectedValue(new Error("Token expired")),
      };
      mockCreateOAuthClient.mockResolvedValue(mockClient as never);

      await expect(
        SessionService.getAgentForSession("failing-session", mockContext),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("deleteSession", () => {
    const mockContext = createMockContext({ host: "localhost:8888" });

    it("does nothing for non-existent session", async () => {
      mockUserSessionStore.get.mockResolvedValue(undefined);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await SessionService.deleteSession("non-existent", mockContext);

      expect(mockUserSessionStore.del).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("revokes OAuth session and deletes user session", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:test" });

      const mockClient = {
        revoke: vi.fn().mockResolvedValue(undefined),
      };
      mockCreateOAuthClient.mockResolvedValue(mockClient as never);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await SessionService.deleteSession("session-to-delete", mockContext);

      expect(mockClient.revoke).toHaveBeenCalledWith("did:plc:test");
      expect(mockUserSessionStore.del).toHaveBeenCalledWith(
        "session-to-delete",
      );
      logSpy.mockRestore();
    });

    it("continues deletion even if OAuth revocation fails", async () => {
      mockUserSessionStore.get.mockResolvedValue({ did: "did:plc:test" });

      const mockClient = {
        revoke: vi.fn().mockRejectedValue(new Error("Revocation failed")),
      };
      mockCreateOAuthClient.mockResolvedValue(mockClient as never);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await SessionService.deleteSession("session-id", mockContext);

      // Should still delete the user session even if revocation fails
      expect(mockUserSessionStore.del).toHaveBeenCalledWith("session-id");
      logSpy.mockRestore();
    });
  });
});
