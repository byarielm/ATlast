/**
 * Follow Service
 * Handles all follow-related operations for AT Protocol
 */

import { Agent } from '@atproto/api';

interface FollowStatusResult {
  [did: string]: boolean;
}

export class FollowService {
  /**
   * Check follow status for multiple DIDs
   * Returns a map of DID -> isFollowing
   */
  static async checkFollowStatus(
    agent: Agent,
    userDid: string,
    dids: string[],
    followLexicon: string = 'app.bsky.graph.follow',
  ): Promise<FollowStatusResult> {
    const followStatus: FollowStatusResult = {};

    // Initialize all as not following
    dids.forEach((did) => {
      followStatus[did] = false;
    });

    if (dids.length === 0) {
      return followStatus;
    }

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
      console.error('Error checking follow status:', error);
      // Return all as false on error (fail-safe)
    }

    return followStatus;
  }

  /**
   * Get list of already followed DIDs from a set
   */
  static async getAlreadyFollowing(
    agent: Agent,
    userDid: string,
    dids: string[],
    followLexicon: string = 'app.bsky.graph.follow',
  ): Promise<Set<string>> {
    const followStatus = await this.checkFollowStatus(
      agent,
      userDid,
      dids,
      followLexicon,
    );

    return new Set(
      Object.entries(followStatus)
        .filter(([_, isFollowing]) => isFollowing)
        .map(([did]) => did),
    );
  }
}
