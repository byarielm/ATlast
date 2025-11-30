export interface OAuthStateRow {
  key: string;
  data: {
    dpopKey: any;
    verifier: string;
    appState?: string;
  };
  created_at: Date;
  expires_at: Date;
}

export interface OAuthSessionRow {
  key: string;
  data: {
    dpopKey: any;
    tokenSet: any;
  };
  created_at: Date;
  expires_at: Date;
}

export interface UserSessionRow {
  session_id: string;
  did: string;
  created_at: Date;
  expires_at: Date;
}

export interface UserUploadRow {
  upload_id: string;
  did: string;
  source_platform: string;
  created_at: Date;
  last_checked: Date | null;
  total_users: number;
  matched_users: number;
  unmatched_users: number;
}

export interface SourceAccountRow {
  id: number;
  source_platform: string;
  source_username: string;
  normalized_username: string;
  last_checked: Date | null;
  match_found: boolean;
  match_found_at: Date | null;
  created_at: Date;
}

export interface UserSourceFollowRow {
  id: number;
  upload_id: string;
  did: string;
  source_account_id: number;
  source_date: string;
  created_at: Date;
}

export interface AtprotoMatchRow {
  id: number;
  source_account_id: number;
  atproto_did: string;
  atproto_handle: string;
  atproto_display_name: string | null;
  atproto_avatar: string | null;
  atproto_description: string | null;
  post_count: number;
  follower_count: number;
  match_score: number;
  found_at: Date;
  last_verified: Date | null;
  is_active: boolean;
  follow_status: Record<string, boolean>;
  last_follow_check: Date | null;
}

export interface UserMatchStatusRow {
  id: number;
  did: string;
  atproto_match_id: number;
  source_account_id: number;
  notified: boolean;
  notified_at: Date | null;
  viewed: boolean;
  viewed_at: Date | null;
  followed: boolean;
  followed_at: Date | null;
  dismissed: boolean;
  dismissed_at: Date | null;
}

export interface NotificationQueueRow {
  id: number;
  did: string;
  new_matches_count: number;
  created_at: Date;
  sent: boolean;
  sent_at: Date | null;
  retry_count: number;
  last_error: string | null;
}
