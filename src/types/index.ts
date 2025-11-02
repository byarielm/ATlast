// Session and Auth Types
export interface AtprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

// TikTok Data Types
export interface TikTokUser {
  username: string;
  date: string;
}

// Search and Match Types
export interface AtprotoMatch {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  matchScore: number;
  description?: string;
  followed?: boolean;
}

export interface SearchResult {
  tiktokUser: TikTokUser;
  atprotoMatches: AtprotoMatch[];
  isSearching: boolean;
  error?: string;
  selectedMatches?: Set<string>;
  sourcePlatform: string;
}

// Progress Tracking
export interface SearchProgress {
  searched: number;
  found: number;
  total: number;
}

// App State
export type AppStep = 'checking' | 'login' | 'home' | 'upload' | 'loading' | 'results';

// API Response Types
export interface BatchSearchResult {
  username: string;
  actors: AtprotoMatch[];
  error?: string;
}

export interface BatchFollowResult {
  did: string;
  success: boolean;
  error: string | null;
}

export interface SaveResultsResponse {
  success: boolean;
  uploadId: string;
  totalUsers: number;
  matchedUsers: number;
  unmatchedUsers: number;
}

export interface Upload {
  uploadId: string;
  sourcePlatform: string;
  createdAt: string;
  totalUsers: number;
  matchedUsers: number;
  unmatchedUsers: number;
}