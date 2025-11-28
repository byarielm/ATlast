import type {
  AtprotoSession,
  BatchSearchResult,
  BatchFollowResult,
  SaveResultsResponse,
  SearchResult,
} from "../../types";

// Client-side cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old entries periodically
    if (this.cache.size > 50) {
      this.cleanup();
    }
  }

  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new ResponseCache();

export const apiClient = {
  // OAuth and Authentication
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

    return res.json();
  },

  async getSession(): Promise<{
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
  }> {
    // Check cache first
    const cacheKey = "session";
    const cached = cache.get<AtprotoSession>(cacheKey);
    if (cached) {
      console.log("Returning cached session");
      return cached;
    }

    const res = await fetch("/.netlify/functions/session", {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("No valid session");
    }

    const data = await res.json();

    // Cache the session data for 5 minutes
    cache.set(cacheKey, data, 5 * 60 * 1000);

    return data;
  },

  async getProfile(): Promise<AtprotoSession> {
    // This is now redundant - getSession returns profile data
    // Keeping for backwards compatibility but it just calls getSession
    return this.getSession();
  },

  async logout(): Promise<void> {
    const res = await fetch("/.netlify/functions/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Logout failed");
    }

    // Clear all caches on logout
    cache.clear();
  },

  // Upload History Operations
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
    // Check cache first
    const cacheKey = "uploads";
    const cached = cache.get<any>(cacheKey, 2 * 60 * 1000); // 2 minute cache for uploads list
    if (cached) {
      console.log("Returning cached uploads");
      return cached;
    }

    const res = await fetch("/.netlify/functions/get-uploads", {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch uploads");
    }

    const data = await res.json();

    // Cache uploads list for 2 minutes
    cache.set(cacheKey, data, 2 * 60 * 1000);

    return data;
  },

  async getUploadDetails(
    uploadId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    results: SearchResult[];
    pagination?: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalUsers: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    // Check cache first (cache by page)
    const cacheKey = `upload-details-${uploadId}-p${page}-s${pageSize}`;
    const cached = cache.get<any>(cacheKey, 10 * 60 * 1000);
    if (cached) {
      console.log(
        "Returning cached upload details for",
        uploadId,
        "page",
        page,
      );
      return cached;
    }

    const res = await fetch(
      `/.netlify/functions/get-upload-details?uploadId=${uploadId}&page=${page}&pageSize=${pageSize}`,
      { credentials: "include" },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch upload details");
    }

    const data = await res.json();

    // Cache upload details page for 10 minutes
    cache.set(cacheKey, data, 10 * 60 * 1000);

    return data;
  },

  // Helper to load all pages (for backwards compatibility)
  async getAllUploadDetails(
    uploadId: string,
  ): Promise<{ results: SearchResult[] }> {
    const firstPage = await this.getUploadDetails(uploadId, 1, 100);

    if (!firstPage.pagination || firstPage.pagination.totalPages === 1) {
      return { results: firstPage.results };
    }

    // Load remaining pages
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
  },

  // NEW: Check follow status
  async checkFollowStatus(
    dids: string[],
    followLexicon: string,
  ): Promise<Record<string, boolean>> {
    // Check cache first
    const cacheKey = `follow-status-${followLexicon}-${dids.slice().sort().join(",")}`;
    const cached = cache.get<Record<string, boolean>>(cacheKey, 2 * 60 * 1000); // 2 minute cache
    if (cached) {
      console.log("Returning cached follow status");
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

    const data = await res.json();

    // Cache for 2 minutes
    cache.set(cacheKey, data.followStatus, 2 * 60 * 1000);

    return data.followStatus;
  },

  // Search Operations
  async batchSearchActors(
    usernames: string[],
    followLexicon?: string,
  ): Promise<{ results: BatchSearchResult[] }> {
    // Create cache key from sorted usernames (so order doesn't matter)
    const cacheKey = `search-${followLexicon || "default"}-${usernames.slice().sort().join(",")}`;
    const cached = cache.get<any>(cacheKey, 10 * 60 * 1000);
    if (cached) {
      console.log(
        "Returning cached search results for",
        usernames.length,
        "users",
      );
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

    const data = await res.json();

    // Cache search results for 10 minutes
    cache.set(cacheKey, data, 10 * 60 * 1000);

    return data;
  },

  // Follow Operations
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

    const data = await res.json();

    // Invalidate caches after following
    cache.invalidate("uploads");
    cache.invalidatePattern("upload-details");
    cache.invalidatePattern("follow-status");

    return data;
  },

  // Save Results
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

      console.log(`Saving ${resultsToSave.length} results in background...`);

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
        const data = await res.json();
        console.log(`Successfully saved ${data.matchedUsers} matches`);

        // Invalidate caches after saving
        cache.invalidate("uploads");
        cache.invalidatePattern("upload-details");

        return data;
      } else {
        console.error("Failed to save results:", res.status, await res.text());
        return null;
      }
    } catch (error) {
      console.error(
        "Error saving results (will continue in background):",
        error,
      );
      return null;
    }
  },

  // Cache management utilities
  cache: {
    clear: () => cache.clear(),
    invalidate: (key: string) => cache.invalidate(key),
    invalidatePattern: (pattern: string) => cache.invalidatePattern(pattern),
  },
};
