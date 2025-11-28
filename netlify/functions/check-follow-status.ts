import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { SessionManager } from "./session-manager";
import cookie from "cookie";

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
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

    // Limit batch size
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

    // Build follow status map
    const followStatus: Record<string, boolean> = {};

    // Initialize all as not following
    dids.forEach((did) => {
      followStatus[did] = false;
    });

    // Query user's follow graph for the specific lexicon
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

        // Check each record
        for (const record of response.data.records) {
          const followRecord = record.value as any;
          if (followRecord?.subject && didsSet.has(followRecord.subject)) {
            followStatus[followRecord.subject] = true;
            didsSet.delete(followRecord.subject); // Found it, no need to keep checking
          }
        }

        cursor = response.data.cursor;
        hasMore = !!cursor;

        // If we've found all DIDs, break early
        if (didsSet.size === 0) {
          break;
        }
      }
    } catch (error) {
      console.error("Error querying follow graph:", error);
      // On error, return all as false (not following) - fail safe
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ followStatus }),
    };
  } catch (error) {
    console.error("Check follow status error:", error);

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
        error: "Failed to check follow status",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
