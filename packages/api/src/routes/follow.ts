/**
 * Follow Routes
 * Handles batch follow operations and follow status checking
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { followRateLimit } from '../middleware/rateLimit';
import { SessionService } from '../services/SessionService';
import { FollowService } from '../services/FollowService';
import { MatchRepository } from '../repositories/MatchRepository';
import type { AppEnv } from '../types/hono';

const follow = new Hono<AppEnv>();

// Validation schemas
const batchFollowSchema = z.object({
  dids: z.array(z.string().startsWith('did:')).min(1).max(100),
  followLexicon: z.string().optional().default('app.bsky.graph.follow'),
});

const checkStatusSchema = z.object({
  dids: z.array(z.string().startsWith('did:')).min(1).max(100),
  followLexicon: z.string().optional().default('app.bsky.graph.follow'),
});

interface FollowResult {
  did: string;
  success: boolean;
  alreadyFollowing: boolean;
  error: string | null;
}

/**
 * POST /api/follow/batch-follow-users
 * Follow multiple users in batch
 *
 * Rate limit: 100 follows per hour (from migration plan)
 * Each request can follow up to 100 users with 5 concurrent operations
 */
follow.post(
  '/batch-follow-users',
  followRateLimit,
  authMiddleware,
  async (c) => {
    try {
      const body = await c.req.json();
      const { dids, followLexicon } = batchFollowSchema.parse(body);

      const sessionId = c.get('sessionId');
      const userDid = c.get('did');

      console.log(
        `[Follow] Batch follow for ${dids.length} users by ${userDid}`,
      );

      // Get authenticated agent
      const { agent } = await SessionService.getAgentForSession(sessionId, c);

      // Check which users are already followed
      const alreadyFollowing = await FollowService.getAlreadyFollowing(
        agent,
        userDid,
        dids,
        followLexicon,
      );

      const matchRepo = new MatchRepository();
      const CONCURRENCY = 5; // Process 5 follows in parallel

      // Helper function to follow a single user
      const followUser = async (did: string): Promise<FollowResult> => {
        // If already following, just update DB and return success
        if (alreadyFollowing.has(did)) {
          try {
            await matchRepo.updateFollowStatus(did, followLexicon, true);
          } catch (dbError) {
            console.error('Failed to update follow status in DB:', dbError);
          }

          return {
            did,
            success: true,
            alreadyFollowing: true,
            error: null,
          };
        }

        // Not following yet - create the follow record
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

          // Update follow status in database
          try {
            await matchRepo.updateFollowStatus(did, followLexicon, true);
          } catch (dbError) {
            console.error('Failed to update follow status in DB:', dbError);
          }

          return {
            did,
            success: true,
            alreadyFollowing: false,
            error: null,
          };
        } catch (error) {
          // Rate limit handling with backoff
          if (
            error instanceof Error &&
            (error.message.includes('rate limit') ||
              error.message.includes('429'))
          ) {
            const backoffDelay = 1000; // 1 second backoff for rate limits
            console.log(
              `[Follow] Rate limit hit for ${did}. Backing off for ${backoffDelay}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          }

          return {
            did,
            success: false,
            alreadyFollowing: false,
            error: error instanceof Error ? error.message : 'Follow failed',
          };
        }
      };

      // Process follows in chunks with controlled concurrency
      const results: FollowResult[] = [];
      for (let i = 0; i < dids.length; i += CONCURRENCY) {
        const chunk = dids.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map((did) => followUser(did)),
        );

        // Extract results from Promise.allSettled
        for (const result of chunkResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // This shouldn't happen as we handle errors in followUser
            console.error('[Follow] Unexpected promise rejection:', result.reason);
            results.push({
              did: 'unknown',
              success: false,
              alreadyFollowing: false,
              error: 'Unexpected error',
            });
          }
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      const alreadyFollowingCount = results.filter(
        (r) => r.alreadyFollowing,
      ).length;

      console.log(
        `[Follow] Completed: ${successCount} succeeded, ${failCount} failed, ${alreadyFollowingCount} already following`,
      );

      return c.json({
        success: true,
        data: {
          total: dids.length,
          succeeded: successCount,
          failed: failCount,
          alreadyFollowing: alreadyFollowingCount,
          results,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error:
              'Invalid request. Please provide a valid array of DIDs (max 100).',
          },
          400,
        );
      }
      throw error; // Let error middleware handle it
    }
  },
);

/**
 * POST /api/follow/check-status
 * Check follow status for multiple DIDs
 */
follow.post('/check-status', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { dids, followLexicon } = checkStatusSchema.parse(body);

    const sessionId = c.get('sessionId');
    const userDid = c.get('did');

    console.log(
      `[Follow] Checking follow status for ${dids.length} users by ${userDid}`,
    );

    // Get authenticated agent
    const { agent } = await SessionService.getAgentForSession(sessionId, c);

    // Check follow status
    const followStatus = await FollowService.checkFollowStatus(
      agent,
      userDid,
      dids,
      followLexicon,
    );

    console.log(
      `[Follow] Status check complete: ${Object.values(followStatus).filter(Boolean).length} following`,
    );

    return c.json({
      success: true,
      data: { followStatus },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error:
            'Invalid request. Please provide a valid array of DIDs (max 100).',
        },
        400,
      );
    }
    throw error; // Let error middleware handle it
  }
});

export default follow;
