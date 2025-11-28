import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { SessionManager } from "./session-manager";
import { getDbClient } from "./db";
import cookie from "cookie";

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const dids: string[] = body.dids || [];
    const followLexicon: string = body.followLexicon || "app.bsky.graph.follow";

    if (!Array.isArray(dids) || dids.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "dids array is required and must not be empty",
        }),
      };
    }

    // Limit batch size to prevent timeouts and respect rate limits
    if (dids.length > 100) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Maximum 100 DIDs per batch" }),
      };
    }

    // Get session from cookie
    const cookies = event.headers.cookie
      ? cookie.parse(event.headers.cookie)
      : {};
    const sessionId = cookies.atlast_session;

    if (!sessionId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No session cookie" }),
      };
    }

    // Get authenticated agent using SessionManager
    const { agent, did: userDid } =
      await SessionManager.getAgentForSession(sessionId);

    // Check existing follows before attempting to follow
    const alreadyFollowing = new Set<string>();
    try {
      let cursor: string | undefined = undefined;
      let hasMore = true;
      const didsSet = new Set(dids);

      while (hasMore && didsSet.size > 0) {
        const response = await agent.api.com.atproto.repo.listRecords({
          repo: userDid,
          collection: followLexicon,
          limit: 100,
          cursor,
        });

        for (const record of response.data.records) {
          const followRecord = record.value as any;
          if (followRecord?.subject && didsSet.has(followRecord.subject)) {
            alreadyFollowing.add(followRecord.subject);
            didsSet.delete(followRecord.subject);
          }
        }

        cursor = response.data.cursor;
        hasMore = !!cursor;

        if (didsSet.size === 0) {
          break;
        }
      }
    } catch (error) {
      console.error("Error checking existing follows:", error);
      // Continue - we'll handle duplicates in the follow loop
    }

    // Follow all users
    const results = [];
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    const sql = getDbClient();

    for (const did of dids) {
      // Skip if already following
      if (alreadyFollowing.has(did)) {
        results.push({
          did,
          success: true,
          alreadyFollowing: true,
          error: null,
        });

        // Update database follow status
        try {
          await sql`
            UPDATE atproto_matches
            SET follow_status = follow_status || jsonb_build_object(${followLexicon}, true),
                last_follow_check = NOW()
            WHERE atproto_did = ${did}
          `;
        } catch (dbError) {
          console.error("Failed to update follow status in DB:", dbError);
        }

        continue;
      }

      try {
        await agent.api.com.atproto.repo.createRecord({
          repo: userDid,
          collection: followLexicon,
          record: {
            $type: followLexicon,
            subject: did,
            createdAt: new Date().toISOString(),
          },
        });

        results.push({
          did,
          success: true,
          alreadyFollowing: false,
          error: null,
        });

        // Update database follow status
        try {
          await sql`
            UPDATE atproto_matches
            SET follow_status = follow_status || jsonb_build_object(${followLexicon}, true),
                last_follow_check = NOW()
            WHERE atproto_did = ${did}
          `;
        } catch (dbError) {
          console.error("Failed to update follow status in DB:", dbError);
        }

        // Reset error counter on success
        consecutiveErrors = 0;
      } catch (error) {
        consecutiveErrors++;

        results.push({
          did,
          success: false,
          alreadyFollowing: false,
          error: error instanceof Error ? error.message : "Follow failed",
        });

        // If we hit rate limits, implement exponential backoff
        if (
          error instanceof Error &&
          (error.message.includes("rate limit") ||
            error.message.includes("429"))
        ) {
          const backoffDelay = Math.min(
            200 * Math.pow(2, consecutiveErrors),
            2000,
          );
          console.log(`Rate limit hit. Backing off for ${backoffDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          // For other repeated errors, small backoff
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const alreadyFollowingCount = results.filter(
      (r) => r.alreadyFollowing,
    ).length;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        total: dids.length,
        succeeded: successCount,
        failed: failCount,
        alreadyFollowing: alreadyFollowingCount,
        results,
      }),
    };
  } catch (error) {
    console.error("Batch follow error:", error);

    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes("session")) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid or expired session",
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to follow users",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
