import { AuthenticatedHandler } from "./core/types";
import { SessionService } from "./services/SessionService";
import { successResponse } from "./utils";
import { withAuthErrorHandling } from "./core/middleware";
import { ValidationError } from "./core/errors";
import { normalize } from "./utils/string.utils";
import { FollowService } from "./services/FollowService";

const batchSearchHandler: AuthenticatedHandler = async (context) => {
  const body = JSON.parse(context.event.body || "{}");
  const usernames: string[] = body.usernames || [];

  if (!Array.isArray(usernames) || usernames.length === 0) {
    throw new ValidationError(
      "usernames array is required and must not be empty",
    );
  }

  if (usernames.length > 50) {
    throw new ValidationError("Maximum 50 usernames per batch");
  }

  const { agent } = await SessionService.getAgentForSession(
    context.sessionId,
    context.event,
  );

  const searchPromises = usernames.map(async (username) => {
    try {
      const response = await agent.app.bsky.actor.searchActors({
        q: username,
        limit: 20,
      });

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

  const allDids = results
    .flatMap((r) => r.actors.map((a: any) => a.did))
    .filter((did): did is string => !!did);

  if (allDids.length > 0) {
    const profileDataMap = new Map<
      string,
      { postCount: number; followerCount: number }
    >();

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
      }
    }

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

  const followLexicon = body.followLexicon || "app.bsky.graph.follow";

  if (allDids.length > 0) {
    try {
      const followStatus = await FollowService.checkFollowStatus(
        agent,
        context.did,
        allDids,
        followLexicon,
      );

      results.forEach((result) => {
        result.actors = result.actors.map((actor: any) => ({
          ...actor,
          followStatus: {
            [followLexicon]: followStatus[actor.did] || false,
          },
        }));
      });
    } catch (error) {
      console.error("Failed to check follow status during search:", error);
    }
  }

  return successResponse({ results });
};

export const handler = withAuthErrorHandling(batchSearchHandler);
