import type { IApiClient } from "../IApiClient";
import type {
  AtprotoSession,
  BatchSearchResult,
  BatchFollowResult,
  SaveResultsResponse,
  SearchResult,
} from "../../../types";

const MOCK_SESSION: AtprotoSession = {
  did: "did:plc:mock123",
  handle: "developer.bsky.social",
  displayName: "Local Developer",
  avatar: undefined,
  description: "Testing ATlast locally",
};

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
      "app.bsky.graph.follow": Math.random() < 0.3,
    },
  }));
}

const delay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock API Client Adapter
 * Simulates API responses for local development
 */
export class MockApiAdapter implements IApiClient {
  async startOAuth(handle: string): Promise<{ url: string }> {
    await delay(300);
    return { url: window.location.origin + "/?session=mock" };
  }

  async getSession(): Promise<AtprotoSession> {
    await delay(200);

    const params = new URLSearchParams(window.location.search);
    if (params.get("session") === "mock") {
      return MOCK_SESSION;
    }

    const mockSession = localStorage.getItem("mock_session");
    if (mockSession) {
      return JSON.parse(mockSession);
    }

    throw new Error("No mock session");
  }

  async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem("mock_session");
    localStorage.removeItem("mock_uploads");
  }

  async checkFollowStatus(
    dids: string[],
    followLexicon: string
  ): Promise<Record<string, boolean>> {
    await delay(300);

    const followStatus: Record<string, boolean> = {};
    dids.forEach((did) => {
      followStatus[did] = Math.random() < 0.3;
    });

    return followStatus;
  }

  async getUploads(): Promise<{ uploads: any[] }> {
    await delay(300);

    const mockUploads = localStorage.getItem("mock_uploads");
    if (mockUploads) {
      return { uploads: JSON.parse(mockUploads) };
    }

    return { uploads: [] };
  }

  async getUploadDetails(
    uploadId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ results: SearchResult[]; pagination?: any }> {
    await delay(500);

    const mockData = localStorage.getItem(`mock_upload_${uploadId}`);
    if (mockData) {
      const results = JSON.parse(mockData);
      return { results };
    }

    return { results: [] };
  }

  async getAllUploadDetails(
    uploadId: string
  ): Promise<{ results: SearchResult[] }> {
    return this.getUploadDetails(uploadId);
  }

  async batchSearchActors(
    usernames: string[],
    followLexicon?: string
  ): Promise<{ results: BatchSearchResult[] }> {
    await delay(800);

    const results: BatchSearchResult[] = usernames.map((username) => ({
      username,
      actors: generateMockMatches(username),
      error: undefined,
    }));

    return { results };
  }

  async batchFollowUsers(
    dids: string[],
    followLexicon: string
  ): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    alreadyFollowing: number;
    results: BatchFollowResult[];
  }> {
    await delay(1000);

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
      alreadyFollowing: 0,
      results,
    };
  }

  async saveResults(
    uploadId: string,
    sourcePlatform: string,
    results: SearchResult[]
  ): Promise<SaveResultsResponse | null> {
    await delay(500);

    localStorage.setItem(`mock_upload_${uploadId}`, JSON.stringify(results));

    const uploads = JSON.parse(localStorage.getItem("mock_uploads") || "[]");
    const matchedUsers = results.filter(
      (r) => r.atprotoMatches.length > 0
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
  }

  cache = {
    clear: () => console.log("[MOCK] Cache cleared"),
    invalidate: (key: string) => console.log("[MOCK] Cache invalidated:", key),
    invalidatePattern: (pattern: string) =>
      console.log("[MOCK] Cache pattern invalidated:", pattern),
  };
}
