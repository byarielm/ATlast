import { HandlerEvent } from "@netlify/functions";

interface SessionFingerprint {
  userAgent: string;
  ipAddress: string;
  createdAt: number;
}

/**
 * Session Security Service
 * Provides additional session replay protection and fingerprinting
 */
export class SessionSecurityService {
  /**
   * Generate a session fingerprint from request headers
   */
  static generateFingerprint(event: HandlerEvent): SessionFingerprint {
    const userAgent = event.headers["user-agent"] || "unknown";
    const ipAddress =
      event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      event.headers["client-ip"] ||
      "unknown";

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

  /**
   * Check if session is being used suspiciously fast
   * (potential replay attack)
   */
  static detectSuspiciousActivity(
    lastUsed: number,
    minIntervalMs: number = 100,
  ): boolean {
    const timeSinceLastUse = Date.now() - lastUsed;

    // If requests are less than 100ms apart, suspicious
    if (timeSinceLastUse < minIntervalMs) {
      console.warn(
        `Suspicious activity: Request ${timeSinceLastUse}ms after last use`,
      );
      return true;
    }

    return false;
  }
}

/**
 * Enhanced session validation middleware
 * Adds fingerprinting to detect session hijacking
 */
export async function validateSessionSecurity(
  event: HandlerEvent,
  sessionId: string,
): Promise<void> {
  const currentFingerprint = SessionSecurityService.generateFingerprint(event);

  // Get stored fingerprint (would need to extend UserSessionStore)
  // For now, just log current fingerprint for monitoring
  console.log("Session fingerprint:", {
    sessionId: sessionId.substring(0, 8) + "...",
    userAgent: currentFingerprint.userAgent.substring(0, 50),
    ip: currentFingerprint.ipAddress,
  });

  // Future: Store and compare fingerprints
  // const session = await userSessions.get(sessionId);
  // if (session.fingerprint) {
  //   if (!SessionSecurityService.verifyFingerprint(session.fingerprint, currentFingerprint)) {
  //     throw new AuthenticationError("Session security check failed");
  //   }
  // }
}

/**
 * Add session fingerprint to new sessions
 * Call this in oauth-callback.ts when creating session
 */
export function createSecureSessionData(
  event: HandlerEvent,
  did: string,
): { did: string; fingerprint: SessionFingerprint } {
  return {
    did,
    fingerprint: SessionSecurityService.generateFingerprint(event),
  };
}
