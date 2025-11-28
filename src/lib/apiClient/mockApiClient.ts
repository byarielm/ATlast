import type {
  AtprotoSession,
  BatchSearchResult,
  BatchFollowResult,
  SearchResult,
  SaveResultsResponse,
} from "../../types";

// Mock user data for testing
const MOCK_SESSION: AtprotoSession = {
  did: "did:plc:mock123",
  handle: "developer.bsky.social",
  displayName: "Local Developer",
  avatar: undefined,
  description: "Testing ATlast locally",
};

// Generate mock Bluesky matches
function generateMockMatches(username: string): any[] {
  const numMatches =
    Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;

  return Array.from({ length: numMatches }, (_, i) => ({
    did: `did:plc:mock${username}${i}`,
    handle: `${username}.bsky.social`,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}${i}`,
    matchScore: 100 - i * 20,
    description: `Mock profile for ${username}`,
    postCount: Math.floor(Math.random() * 1000),
    followerCount: Math.floor(Math.random() * 5000),
    followStatus: {
      "app.bsky.graph.follow": Math.random() < 0.3, // 30% already following
    },
  }));
}

// Simulate network delay
const delay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiClient = {
  async startOAuth(handle: string): Promise<{ url: string }> {
    await delay(300);
    console.log("[MOCK] Starting OAuth for:", handle);
    // In mock mode, just return to home immediately
    return { url: window.location.origin + "/?session=mock" };
  },

  async getSession(): Promise<AtprotoSession> {
    await delay(200);
    console.log("[MOCK] Getting session");

    // Check if user has "logged in" via mock OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("session") === "mock") {
      return MOCK_SESSION;
    }

    // Check localStorage for mock session
    const mockSession = localStorage.getItem("mock_session");
    if (mockSession) {
      return JSON.parse(mockSession);
    }

    throw new Error("No mock session");
  },

  async logout(): Promise<void> {
    await delay(200);
    console.log("[MOCK] Logging out");
    localStorage.removeItem("mock_session");
    localStorage.removeItem("mock_uploads");
  },

  async checkFollowStatus(
    dids: string[],
    followLexicon: string,
  ): Promise<Record<string, boolean>> {
    await delay(300);
    console.log("[MOCK] Checking follow status for:", dids.length, "DIDs");

    // Mock: 30% chance each user is already followed
    const followStatus: Record<string, boolean> = {};
    dids.forEach((did) => {
      followStatus[did] = Math.random() < 0.3;
    });

    return followStatus;
  },

  async getUploads(): Promise<{ uploads: any[] }> {
    await delay(300);
    console.log("[MOCK] Getting uploads");

    const mockUploads = localStorage.getItem("mock_uploads");
    if (mockUploads) {
      return { uploads: JSON.parse(mockUploads) };
    }

    return { uploads: [] };
  },

  async getUploadDetails(
    uploadId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    results: SearchResult[];
    pagination?: any;
  }> {
    await delay(500);
    console.log("[MOCK] Getting upload details:", uploadId);

    const mockData = localStorage.getItem(`mock_upload_${uploadId}`);
    if (mockData) {
      const results = JSON.parse(mockData);
      return { results };
    }

    return { results: [] };
  },

  async getAllUploadDetails(
    uploadId: string,
  ): Promise<{ results: SearchResult[] }> {
    return this.getUploadDetails(uploadId);
  },

  async batchSearchActors(
    usernames: string[],
    followLexicon?: string,
  ): Promise<{ results: BatchSearchResult[] }> {
    await delay(800); // Simulate API delay
    console.log("[MOCK] Searching for:", usernames);

    const results: BatchSearchResult[] = usernames.map((username) => ({
      username,
      actors: generateMockMatches(username),
      error: undefined,
    }));

    return { results };
  },

  async batchFollowUsers(dids: string[]): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    results: BatchFollowResult[];
  }> {
    await delay(1000);
    console.log("[MOCK] Following users:", dids);

    const results: BatchFollowResult[] = dids.map((did) => ({
      did,
      success: true,
      error: null,
    }));

    return {
      success: true,
      total: dids.length,
      succeeded: dids.length,
      failed: 0,
      results,
    };
  },

  async saveResults(
    uploadId: string,
    sourcePlatform: string,
    results: SearchResult[],
  ): Promise<SaveResultsResponse> {
    await delay(500);
    console.log("[MOCK] Saving results:", {
      uploadId,
      sourcePlatform,
      count: results.length,
    });

    // Save to localStorage
    localStorage.setItem(`mock_upload_${uploadId}`, JSON.stringify(results));

    // Add to uploads list
    const uploads = JSON.parse(localStorage.getItem("mock_uploads") || "[]");
    const matchedUsers = results.filter(
      (r) => r.atprotoMatches.length > 0,
    ).length;

    uploads.unshift({
      uploadId,
      sourcePlatform,
      createdAt: new Date().toISOString(),
      totalUsers: results.length,
      matchedUsers,
      unmatchedUsers: results.length - matchedUsers,
    });

    localStorage.setItem("mock_uploads", JSON.stringify(uploads));

    return {
      success: true,
      uploadId,
      totalUsers: results.length,
      matchedUsers,
      unmatchedUsers: results.length - matchedUsers,
    };
  },

  cache: {
    clear: () => console.log("[MOCK] Cache cleared"),
    invalidate: (key: string) => console.log("[MOCK] Cache invalidated:", key),
    invalidatePattern: (pattern: string) =>
      console.log("[MOCK] Cache pattern invalidated:", pattern),
  },
};
