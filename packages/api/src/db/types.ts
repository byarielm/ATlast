/**
 * Database Schema Types
 * Generated from scripts/init-db.sql
 */

import type { ColumnType } from 'kysely';

/**
 * Timestamp columns that are auto-generated
 */
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

/**
 * OAuth State Storage (transient)
 */
export interface OAuthStatesTable {
  state: string;
  data: Record<string, unknown>;
  created_at: Generated<Timestamp>;
}

/**
 * OAuth Sessions (transient)
 */
export interface OAuthSessionsTable {
  did: string;
  session_data: Record<string, unknown>;
  updated_at: Generated<Timestamp>;
}

/**
 * User Sessions (transient)
 */
export interface UserSessionsTable {
  session_id: string;
  did: string;
  fingerprint: string;
  created_at: Generated<Timestamp>;
  expires_at: Timestamp;
}

/**
 * User Uploads (persistent)
 */
export interface UserUploadsTable {
  upload_id: string;
  user_did: string;
  source_platform: string;
  created_at: Generated<Timestamp>;
  total_users: Generated<number>;
  matched_users: Generated<number>;
  unmatched_users: Generated<number>;
}

/**
 * Source Accounts (persistent)
 */
export interface SourceAccountsTable {
  id: Generated<number>;
  source_platform: string;
  original_username: string;
  normalized_username: string;
  date_on_source: Timestamp | null;
  created_at: Generated<Timestamp>;
}

/**
 * User-Source Follows (join table)
 */
export interface UserSourceFollowsTable {
  user_did: string;
  upload_id: string;
  source_account_id: number;
  found_at: Generated<Timestamp>;
}

/**
 * AT Protocol Matches (persistent)
 */
export interface AtprotoMatchesTable {
  id: Generated<number>;
  source_account_id: number;
  atproto_did: string;
  atproto_handle: string;
  display_name: string | null;
  match_score: number;
  post_count: number | null;
  follower_count: number | null;
  follow_status: Generated<Record<string, unknown>>;
  found_at: Generated<Timestamp>;
}

/**
 * User Match Status (persistent)
 */
export interface UserMatchStatusTable {
  user_did: string;
  match_id: number;
  viewed: Generated<boolean>;
  dismissed: Generated<boolean>;
  followed: Generated<boolean>;
  notified: Generated<boolean>;
  updated_at: Generated<Timestamp>;
}

/**
 * Notification Queue (transient - for Phase 2)
 */
export interface NotificationQueueTable {
  id: Generated<number>;
  user_did: string;
  match_id: number;
  notification_type: 'in_app' | 'bluesky_dm' | 'partner_api';
  status: Generated<'pending' | 'sent' | 'failed'>;
  attempts: Generated<number>;
  last_attempt: Timestamp | null;
  error_message: string | null;
  created_at: Generated<Timestamp>;
}

/**
 * Partner API Keys (for Phase 2)
 */
export interface PartnerApiKeysTable {
  id: Generated<number>;
  partner_name: string;
  api_key_hash: string;
  created_at: Generated<Timestamp>;
  last_used: Timestamp | null;
  is_active: Generated<boolean>;
}

/**
 * Database schema interface
 */
export interface Database {
  oauth_states: OAuthStatesTable;
  oauth_sessions: OAuthSessionsTable;
  user_sessions: UserSessionsTable;
  user_uploads: UserUploadsTable;
  source_accounts: SourceAccountsTable;
  user_source_follows: UserSourceFollowsTable;
  atproto_matches: AtprotoMatchesTable;
  user_match_status: UserMatchStatusTable;
  notification_queue: NotificationQueueTable;
  partner_api_keys: PartnerApiKeysTable;
}
