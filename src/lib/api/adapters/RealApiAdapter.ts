import type { IApiClient } from "../IApiClient";
import type {
  AtprotoSession,
  BatchSearchResult,
  BatchFollowResult,
  SaveResultsResponse,
  SearchResult,
} from "../../../types";
import { CacheService } from "../../../lib/utils/cache";
import { CACHE_CONFIG } from "../../../config/constants";

/**
 * Unwrap standardized API response format
 */
function unwrapResponse<T>(response: any): T {
  if (response.success !== undefined && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
}

/**
 * Real API Client Adapter
 * Implements actual HTTP calls to backend
 */
export class RealApiAdapter implements IApiClient {
  private responseCache = new CacheService(CACHE_CONFIG.DEFAULT_TTL);

  async startOAuth(handle: string): Promise<{ url: string }> {
    const currentOrigin = window.location.origin;

    const res = await fetch("/.netlify/functions/oauth-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login_hint: handle,
        origin: currentOrigin,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to start OAuth flow");
    }

    const response = await res.json();
    return unwrapResponse<{ url: string }>(response);
  }

  async getSession(): Promise<AtprotoSession> {
    const cacheKey = "session";
    const cached = this.responseCache.get<AtprotoSession>(cacheKey);
    if (cached) {
      return cached;
    }

    const res = await fetch("/.netlify/functions/session", {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("No valid session");
    }

    const response = await res.json();
    const data = unwrapResponse<AtprotoSession>(response);

    this.responseCache.set(cacheKey, data, CACHE_CONFIG.PROFILE_TTL);
    return data;
  }

  async logout(): Promise<void> {
    const res = await fetch("/.netlify/functions/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Logout failed");
    }

    this.responseCache.clear();
  }

  async getUploads(): Promise<{
    uploads: Array<{
      uploadId: string;
      sourcePlatform: string;
      createdAt: string;
      totalUsers: number;
      matchedUsers: number;
      unmatchedUsers: number;
    }>;
  }> {
    const cacheKey = "uploads";
    const cached = this.responseCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const res = await fetch("/.netlify/functions/get-uploads", {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch uploads");
    }

    const response = await res.json();
    const data = unwrapResponse<any>(response);

    this.responseCache.set(cacheKey, data, CACHE_CONFIG.UPLOAD_LIST_TTL);
    return data;
  }

  async getUploadDetails(
    uploadId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    results: SearchResult[];
    pagination?: any;
  }> {
    const cacheKey = `upload-details-${uploadId}-p${page}-s${pageSize}`;
    const cached = this.responseCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const res = await fetch(
      `/.netlify/functions/get-upload-details?uploadId=${uploadId}&page=${page}&pageSize=${pageSize}`,
      { credentials: "include" },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch upload details");
    }

    const response = await res.json();
    const data = unwrapResponse<any>(response);

    this.responseCache.set(cacheKey, data, CACHE_CONFIG.UPLOAD_DETAILS_TTL);
    return data;
  }

  async getAllUploadDetails(
    uploadId: string,
  ): Promise<{ results: SearchResult[] }> {
    const firstPage = await this.getUploadDetails(uploadId, 1, 100);

    if (!firstPage.pagination || firstPage.pagination.totalPages === 1) {
      return { results: firstPage.results };
    }

    const allResults = [...firstPage.results];
    const promises = [];

    for (let page = 2; page <= firstPage.pagination.totalPages; page++) {
      promises.push(this.getUploadDetails(uploadId, page, 100));
    }

    const remainingPages = await Promise.all(promises);
    for (const pageData of remainingPages) {
      allResults.push(...pageData.results);
    }

    return { results: allResults };
  }

  async checkFollowStatus(
    dids: string[],
    followLexicon: string,
  ): Promise<Record<string, boolean>> {
    const cacheKey = `follow-status-${followLexicon}-${dids.slice().sort().join(",")}`;
    const cached = this.responseCache.get<Record<string, boolean>>(cacheKey);
    if (cached) {
      return cached;
    }

    const res = await fetch("/.netlify/functions/check-follow-status", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dids, followLexicon }),
    });

    if (!res.ok) {
      throw new Error("Failed to check follow status");
    }

    const response = await res.json();
    const data = unwrapResponse<{ followStatus: Record<string, boolean> }>(
      response,
    );

    this.responseCache.set(
      cacheKey,
      data.followStatus,
      CACHE_CONFIG.FOLLOW_STATUS_TTL,
    );
    return data.followStatus;
  }

  async batchSearchActors(
    usernames: string[],
    followLexicon?: string,
  ): Promise<{ results: BatchSearchResult[] }> {
    const cacheKey = `search-${followLexicon || "default"}-${usernames.slice().sort().join(",")}`;
    const cached = this.responseCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const res = await fetch("/.netlify/functions/batch-search-actors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames, followLexicon }),
    });

    if (!res.ok) {
      throw new Error(`Batch search failed: ${res.status}`);
    }

    const response = await res.json();
    const data = unwrapResponse<{ results: BatchSearchResult[] }>(response);

    this.responseCache.set(cacheKey, data, CACHE_CONFIG.SEARCH_RESULTS_TTL);
    return data;
  }

  async batchFollowUsers(
    dids: string[],
    followLexicon: string,
  ): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    alreadyFollowing: number;
    results: BatchFollowResult[];
  }> {
    const res = await fetch("/.netlify/functions/batch-follow-users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dids, followLexicon }),
    });

    if (!res.ok) {
      throw new Error("Batch follow failed");
    }

    const response = await res.json();
    const data = unwrapResponse<any>(response);

    // Invalidate caches after following
    this.responseCache.invalidate("uploads");
    this.responseCache.invalidatePattern("upload-details");
    this.responseCache.invalidatePattern("follow-status");

    return data;
  }

  async saveResults(
    uploadId: string,
    sourcePlatform: string,
    results: SearchResult[],
  ): Promise<SaveResultsResponse | null> {
    try {
      const resultsToSave = results
        .filter((r) => !r.isSearching)
        .map((r) => ({
          sourceUser: r.sourceUser,
          atprotoMatches: r.atprotoMatches || [],
        }));

      const res = await fetch("/.netlify/functions/save-results", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          sourcePlatform,
          results: resultsToSave,
        }),
      });

      if (res.ok) {
        const response = await res.json();
        const data = unwrapResponse<SaveResultsResponse>(response);

        // Invalidate caches
        this.responseCache.invalidate("uploads");
        this.responseCache.invalidatePattern("upload-details");

        return data;
      } else {
        console.error("Failed to save results:", res.status);
        return null;
      }
    } catch (error) {
      console.error("Error saving results:", error);
      return null;
    }
  }

  cache = {
    clear: () => this.responseCache.clear(),
    invalidate: (key: string) => this.responseCache.delete(key),
    invalidatePattern: (pattern: string) =>
      this.responseCache.invalidatePattern(pattern),
  };
}
