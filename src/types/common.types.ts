export type AppStep =
  | "checking"
  | "login"
  | "home"
  | "upload"
  | "loading"
  | "results";

export interface Upload {
  uploadId: string;
  sourcePlatform: string;
  createdAt: string;
  totalUsers: number;
  matchedUsers: number;
  unmatchedUsers: number;
}

export interface SaveResultsResponse {
  success: boolean;
  uploadId: string;
  totalUsers: number;
  matchedUsers: number;
  unmatchedUsers: number;
}
