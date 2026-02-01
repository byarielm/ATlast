/**
 * Search Routes
 * Handles batch search for AT Protocol actors
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { searchRateLimit } from '../middleware/rateLimit';
import { SessionService } from '../services/SessionService';
import { FollowService } from '../services/FollowService';
import { normalize } from '../utils/string.utils';
import type { AppEnv } from '../types/hono';

const search = new Hono<AppEnv>();

// Validation schema for batch search request
const batchSearchSchema = z.object({
  usernames: z.array(z.string()).min(1).max(50),
  followLexicon: z.string().optional().default('app.bsky.graph.follow'),
});

interface RankedActor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  matchScore: number;
  postCount?: number;
  followerCount?: number;
  followStatus?: Record<string, boolean>;
}

interface EnrichedActor extends RankedActor {
  postCount: number;
  followerCount: number;
  followStatus: Record<string, boolean>;
}

interface SearchResult {
  username: string;
  actors: EnrichedActor[];
  error: string | null;
}

/**
 * POST /api/search/batch-search-actors
 * Search for multiple usernames on AT Protocol
 *
 * Rate limit: 10 requests per minute (each can search up to 50 usernames)
 */
search.post(
  '/batch-search-actors',
  searchRateLimit,
  authMiddleware,
  async (c) => {
    try {
      const body = await c.req.json();
      const { usernames, followLexicon } = batchSearchSchema.parse(body);

      const sessionId = c.get('sessionId');
      const did = c.get('did');

      console.log(
        `[Search] Batch search for ${usernames.length} usernames by ${did}`,
      );

      // Get authenticated agent
      const { agent } = await SessionService.getAgentForSession(sessionId, c);

      // Search for each username
      const searchPromises = usernames.map(async (username) => {
        try {
          const response = await agent.app.bsky.actor.searchActors({
            q: username,
            limit: 20,
          });

          const normalizedUsername = normalize(username);

          // Rank actors by match quality
          const rankedActors = response.data.actors
            .map((actor): RankedActor => {
              const handlePart = actor.handle.split('.')[0];
              const normalizedHandle = normalize(handlePart);
              const normalizedFullHandle = normalize(actor.handle);
              const normalizedDisplayName = normalize(
                actor.displayName || '',
              );

              // Calculate match score
              let score = 0;
              if (normalizedHandle === normalizedUsername) score = 100;
              else if (normalizedFullHandle === normalizedUsername) score = 90;
              else if (normalizedDisplayName === normalizedUsername) score = 80;
              else if (normalizedHandle.includes(normalizedUsername))
                score = 60;
              else if (normalizedFullHandle.includes(normalizedUsername))
                score = 50;
              else if (normalizedDisplayName.includes(normalizedUsername))
                score = 40;
              else if (normalizedUsername.includes(normalizedHandle))
                score = 30;

              return {
                did: actor.did,
                handle: actor.handle,
                displayName: actor.displayName,
                avatar: actor.avatar,
                description: actor.description,
                matchScore: score,
              };
            })
            .filter((actor) => actor.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore)
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
            error:
              error instanceof Error ? error.message : 'Search failed',
          };
        }
      });

      const results = (await Promise.all(searchPromises)) as SearchResult[];

      // Collect all DIDs from results
      const allDids = results
        .flatMap((r) => r.actors.map((a) => a.did))
        .filter((did): did is string => !!did);

      // Enrich with profile data (post count, follower count)
      if (allDids.length > 0) {
        const profileDataMap = new Map<
          string,
          { postCount: number; followerCount: number }
        >();

        const PROFILE_BATCH_SIZE = 25;
        for (let i = 0; i < allDids.length; i += PROFILE_BATCH_SIZE) {
          const batch = allDids.slice(i, i + PROFILE_BATCH_SIZE);
          try {
            const profilesResponse =
              await agent.app.bsky.actor.getProfiles({
                actors: batch,
              });

            profilesResponse.data.profiles.forEach((profile) => {
              profileDataMap.set(profile.did, {
                postCount: profile.postsCount || 0,
                followerCount: profile.followersCount || 0,
              });
            });
          } catch (error) {
            console.error('Failed to fetch profile batch:', error);
          }
        }

        // Add profile data to results
        results.forEach((result) => {
          result.actors = result.actors.map((actor): EnrichedActor => {
            const enrichedData = profileDataMap.get(actor.did);
            return {
              ...actor,
              postCount: enrichedData?.postCount || 0,
              followerCount: enrichedData?.followerCount || 0,
              followStatus: {},
            };
          });
        });
      }

      // Check follow status for all actors
      if (allDids.length > 0) {
        try {
          const followStatus = await FollowService.checkFollowStatus(
            agent,
            did,
            allDids,
            followLexicon,
          );

          results.forEach((result) => {
            result.actors = result.actors.map((actor): EnrichedActor => ({
              ...actor,
              followStatus: {
                [followLexicon]: followStatus[actor.did] || false,
              },
            }));
          });
        } catch (error) {
          console.error(
            'Failed to check follow status during search:',
            error,
          );
        }
      }

      console.log(
        `[Search] Found ${allDids.length} total actors across ${results.length} searches`,
      );

      return c.json({
        success: true,
        data: { results },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: 'Invalid request. Please provide a valid array of usernames (max 50).',
          },
          400,
        );
      }
      throw error; // Let error middleware handle it
    }
  },
);

export default search;
