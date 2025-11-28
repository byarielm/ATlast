import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { SessionManager } from "./session-manager";
import cookie from "cookie";

export const handler: Handler = async (
  event: HandlerEvent,
): Promise<HandlerResponse> => {
  try {
    // Parse batch request
    const body = JSON.parse(event.body || "{}");
    const usernames: string[] = body.usernames || [];

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "usernames array is required and must not be empty",
        }),
      };
    }

    // Limit batch size to prevent timeouts
    if (usernames.length > 50) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Maximum 50 usernames per batch" }),
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
    const { agent } = await SessionManager.getAgentForSession(sessionId);

    // Search all usernames in parallel
    const searchPromises = usernames.map(async (username) => {
      try {
        const response = await agent.app.bsky.actor.searchActors({
          q: username,
          limit: 20,
        });

        // Filter and rank matches (same logic as before)
        const normalize = (s: string) => s.toLowerCase().replace(/[._-]/g, "");
        const normalizedUsername = normalize(username);

        const rankedActors = response.data.actors
          .map((actor: any) => {
            const handlePart = actor.handle.split(".")[0];
            const normalizedHandle = normalize(handlePart);
            const normalizedFullHandle = normalize(actor.handle);
            const normalizedDisplayName = normalize(actor.displayName || "");

            let score = 0;
            if (normalizedHandle === normalizedUsername) score = 100;
            else if (normalizedFullHandle === normalizedUsername) score = 90;
            else if (normalizedDisplayName === normalizedUsername) score = 80;
            else if (normalizedHandle.includes(normalizedUsername)) score = 60;
            else if (normalizedFullHandle.includes(normalizedUsername))
              score = 50;
            else if (normalizedDisplayName.includes(normalizedUsername))
              score = 40;
            else if (normalizedUsername.includes(normalizedHandle)) score = 30;

            return {
              ...actor,
              matchScore: score,
              did: actor.did,
            };
          })
          .filter((actor: any) => actor.matchScore > 0)
          .sort((a: any, b: any) => b.matchScore - a.matchScore)
          .slice(0, 5);

        return {
          username,
          actors: rankedActors,
          error: null,
        };
      } catch (error) {
        return {
          username,
          actors: [],
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    });

    const results = await Promise.all(searchPromises);

    // Enrich results with follower and post counts using getProfiles
    const allDids = results
      .flatMap((r) => r.actors.map((a: any) => a.did))
      .filter((did): did is string => !!did);

    if (allDids.length > 0) {
      // Create a map to store enriched profile data
      const profileDataMap = new Map<
        string,
        { postCount: number; followerCount: number }
      >();

      // Batch fetch profiles (25 at a time - API limit)
      const PROFILE_BATCH_SIZE = 25;
      for (let i = 0; i < allDids.length; i += PROFILE_BATCH_SIZE) {
        const batch = allDids.slice(i, i + PROFILE_BATCH_SIZE);
        try {
          const profilesResponse = await agent.app.bsky.actor.getProfiles({
            actors: batch,
          });

          profilesResponse.data.profiles.forEach((profile: any) => {
            profileDataMap.set(profile.did, {
              postCount: profile.postsCount || 0,
              followerCount: profile.followersCount || 0,
            });
          });
        } catch (error) {
          console.error("Failed to fetch profile batch:", error);
          // Continue even if one batch fails
        }
      }

      // Merge enriched data back into results
      results.forEach((result) => {
        result.actors = result.actors.map((actor: any) => {
          const enrichedData = profileDataMap.get(actor.did);
          return {
            ...actor,
            postCount: enrichedData?.postCount || 0,
            followerCount: enrichedData?.followerCount || 0,
          };
        });
      });
    }

    // Check follow status for all matched DIDs in chosen lexicon
    const followLexicon = body.followLexicon || "app.bsky.graph.follow";

    if (allDids.length > 0) {
      try {
        let cursor: string | undefined = undefined;
        let hasMore = true;
        const didsSet = new Set(allDids);
        const followedDids = new Set<string>();
        const repoDid = await SessionManager.getDIDForSession(sessionId);

        if (repoDid === null) {
          throw new Error("Could not retrieve DID for session.");
        }

        // Query user's follow graph
        while (hasMore && didsSet.size > 0) {
          const response = await agent.api.com.atproto.repo.listRecords({
            repo: repoDid,
            collection: followLexicon,
            limit: 100,
            cursor,
          });

          // Check each record
          for (const record of response.data.records) {
            const followRecord = record.value as any;
            if (followRecord?.subject && didsSet.has(followRecord.subject)) {
              followedDids.add(followRecord.subject);
            }
          }

          cursor = response.data.cursor;
          hasMore = !!cursor;
        }

        // Add follow status to results
        results.forEach((result) => {
          result.actors = result.actors.map((actor: any) => ({
            ...actor,
            followStatus: {
              [followLexicon]: followedDids.has(actor.did),
            },
          }));
        });
      } catch (error) {
        console.error("Failed to check follow status during search:", error);
        // Continue without follow status - non-critical
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ results }),
    };
  } catch (error) {
    console.error("Batch search error:", error);

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
        error: "Failed to search actors",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
