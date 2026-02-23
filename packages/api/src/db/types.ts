/**
 * Database Schema Types
 * Re-exported from @atlast/shared so both api and worker can share the same types.
 */

export type {
  Generated,
  Timestamp,
  OAuthStatesTable,
  OAuthSessionsTable,
  UserSessionsTable,
  UserUploadsTable,
  SourceAccountsTable,
  UserSourceFollowsTable,
  AtprotoMatchesTable,
  UserMatchStatusTable,
  NotificationQueueTable,
  PartnerApiKeysTable,
  Database,
} from '@atlast/shared/types/database';
