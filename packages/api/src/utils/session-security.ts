import { Context } from "hono";

export interface SessionFingerprint {
  userAgent: string;
  ipAddress: string;
  createdAt: number;
}

/**
 * Session Security Service
 * Provides session replay protection and fingerprinting for Hono
 */
export class SessionSecurityService {
  /**
   * Generate a session fingerprint from request headers
   */
  static generateFingerprint(c: Context): SessionFingerprint {
    const userAgent = c.req.header("user-agent") || "unknown";
    const forwardedFor = c.req.header("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0].trim() || c.req.header("client-ip") || "unknown";

    return {
      userAgent,
      ipAddress,
      createdAt: Date.now(),
    };
  }

  /**
   * Verify session fingerprint matches current request
   * Helps detect session hijacking
   */
  static verifyFingerprint(
    stored: SessionFingerprint,
    current: SessionFingerprint,
  ): boolean {
    // User agent must match exactly
    if (stored.userAgent !== current.userAgent) {
      console.warn("Session fingerprint mismatch: User-Agent changed");
      return false;
    }

    // IP can change (mobile networks, VPN) but log if it does
    if (stored.ipAddress !== current.ipAddress) {
      console.info(
        `Session IP changed: ${stored.ipAddress} -> ${current.ipAddress}`,
      );
      // Don't fail - just log for monitoring
    }

    return true;
  }
}

/**
 * Add session fingerprint to new sessions
 * Call this in oauth-callback when creating session
 */
export function createSecureSessionData(
  c: Context,
  did: string,
): { did: string; fingerprint: SessionFingerprint } {
  return {
    did,
    fingerprint: SessionSecurityService.generateFingerprint(c),
  };
}
