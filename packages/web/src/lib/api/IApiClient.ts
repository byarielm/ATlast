import type {
  AtprotoSession,
  BatchSearchResult,
  BatchFollowResult,
  SaveResultsResponse,
  SearchResult,
} from "../../types";

/**
 * API Client Interface
 * Defines the contract that all API implementations must follow
 **/
export interface IApiClient {
  // Authentication
  startOAuth(handle: string): Promise<{ url: string }>;
  getSession(): Promise<AtprotoSession>;
  logout(): Promise<void>;

  // Upload History
  getUploads(): Promise<{
    uploads: Array<{
      uploadId: string;
      sourcePlatform: string;
      createdAt: string;
      totalUsers: number;
      matchedUsers: number;
      unmatchedUsers: number;
    }>;
  }>;

  getUploadDetails(
    uploadId: string,
    page?: number,
    pageSize?: number,
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
  }>;

  getAllUploadDetails(uploadId: string): Promise<{ results: SearchResult[] }>;

  // Search Operations
  batchSearchActors(
    usernames: string[],
    followLexicon?: string,
  ): Promise<{ results: BatchSearchResult[] }>;

  checkFollowStatus(
    dids: string[],
    followLexicon: string,
  ): Promise<Record<string, boolean>>;

  // Follow Operations
  batchFollowUsers(
    dids: string[],
    followLexicon: string,
  ): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    alreadyFollowing: number;
    results: BatchFollowResult[];
  }>;

  // Save Results
  saveResults(
    uploadId: string,
    sourcePlatform: string,
    results: SearchResult[],
  ): Promise<SaveResultsResponse | null>;

  // Cache management
  cache: {
    clear: () => void;
    invalidate: (key: string) => void;
    invalidatePattern: (pattern: string) => void;
  };
}
