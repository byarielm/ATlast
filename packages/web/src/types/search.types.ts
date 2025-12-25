export interface SourceUser {
  username: string;
  date: string;
}

export interface AtprotoMatch {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  matchScore: number;
  description?: string;
  followStatus?: Record<string, boolean>;
  postCount?: number;
  followerCount?: number;
  foundAt?: string;
}

export interface SearchResult {
  sourceUser: SourceUser;
  atprotoMatches: AtprotoMatch[];
  isSearching: boolean;
  error?: string;
  selectedMatches?: Set<string>;
  sourcePlatform: string;
}

export interface SearchProgress {
  searched: number;
  found: number;
  total: number;
}

export interface BatchSearchResult {
  username: string;
  actors: AtprotoMatch[];
  error?: string;
}

export interface BatchFollowResult {
  did: string;
  success: boolean;
  alreadyFollowing?: boolean;
  error: string | null;
}
