/**
 * AT Protocol type definitions
 * Based on @atproto/api response schemas
 */

/**
 * Actor profile from app.bsky.actor.searchActors
 */
export interface ATProtoActor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  indexedAt?: string;
  labels?: any[]; // Moderation labels
}

/**
 * Detailed profile from app.bsky.actor.getProfiles
 */
export interface ATProtoProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  indexedAt?: string;
  labels?: any[];
}

/**
 * Actor with match score (search result)
 */
export interface RankedActor extends ATProtoActor {
  matchScore: number;
}

/**
 * Enriched actor with profile data and follow status
 */
export interface EnrichedActor extends RankedActor {
  postCount: number;
  followerCount: number;
  followStatus?: Record<string, boolean>;
}

/**
 * Search actors response
 */
export interface SearchActorsResponse {
  actors: ATProtoActor[];
  cursor?: string;
}

/**
 * Get profiles response
 */
export interface GetProfilesResponse {
  profiles: ATProtoProfile[];
}
