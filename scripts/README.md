# Database Scripts

This directory contains database schema and utility scripts for the ATlast migration.

## Files

- **`init-db.sql`** - PostgreSQL schema definition (tables, indexes, functions)
- **`seed-test-data.sql`** - Test data for local development
- **`generate-encryption-key.ts`** - OAuth key generation utility
- **`keygen.js`** - Legacy key generation script

## Database Setup

### Local Development (Docker)

1. **Start PostgreSQL container:**
   ```bash
   cd docker
   docker compose up -d database
   ```

2. **Initialize schema:**
   ```bash
   docker compose exec database psql -U atlast -d atlast -f /docker-entrypoint-initdb.d/init.sql
   ```

   Or connect and run manually:
   ```bash
   docker compose exec -i database psql -U atlast -d atlast < scripts/init-db.sql
   ```

3. **Seed test data (optional):**
   ```bash
   docker compose exec -i database psql -U atlast -d atlast < scripts/seed-test-data.sql
   ```

4. **Verify setup:**
   ```bash
   cd packages/api
   DATABASE_URL=postgresql://atlast:password@localhost:5432/atlast pnpm run test:db
   ```

### Production Setup

The database will be automatically initialized when the Docker container starts, as `init-db.sql` is mounted to `/docker-entrypoint-initdb.d/init.sql` in the compose file.

## Schema Overview

### Transient Tables (Session Data)
- `oauth_states` - OAuth flow state storage
- `oauth_sessions` - OAuth session data
- `user_sessions` - User authentication sessions
- `notification_queue` - Pending notifications (Phase 2)

**Note:** Transient data is cleaned up daily via the `cleanup_transient_data()` function.

### Persistent Tables (User Data)
- `user_uploads` - Upload history and metadata
- `source_accounts` - Usernames from source platforms (Instagram, TikTok, etc.)
- `user_source_follows` - Links users to their source account follows
- `atproto_matches` - Matched AT Protocol accounts
- `user_match_status` - User interaction with matches (viewed, followed, etc.)
- `partner_api_keys` - API keys for partner integrations (Phase 2)

## Key Features

### Fuzzy Matching
The schema includes the `pg_trgm` extension for fuzzy username matching. This enables:
- Similarity-based searches (`%` operator)
- Trigram GIN indexes for fast fuzzy lookups
- Essential for Phase 2 Tap server matching

### Indexes
All tables are indexed for common query patterns:
- Foreign key indexes for joins
- Partial indexes for filtered queries (e.g., unnotified matches)
- GIN indexes for fuzzy text matching

### Cleanup Function
The `cleanup_transient_data()` function automatically removes:
- Expired OAuth states (>1 hour old)
- Expired user sessions
- Old notification records (>7 days sent, >30 days failed)

This runs daily via BullMQ worker in production.

## Testing

### Test Connection
```bash
cd packages/api
DATABASE_URL=postgresql://atlast:password@localhost:5432/atlast pnpm run test:db
```

This script verifies:
- Database connectivity
- Required extensions are installed
- All tables exist
- Indexes are created
- Fuzzy matching works
- Displays record counts

### Manual Testing
```bash
# Connect to database
docker compose exec database psql -U atlast

# List tables
\dt

# List indexes
\di

# Check extensions
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');

# Test fuzzy matching
SELECT similarity('johndoe', 'john_doe');

# Run cleanup function
SELECT cleanup_transient_data();
```

## Migration Notes

### Phase 1 (Current)
- No periodic checking features
- Notification queue exists but is not used until Phase 2
- Partner API keys table exists but is not used until Phase 2

### Phase 2 (Future)
- Tap server will use fuzzy matching to detect new accounts
- Notification system will use the notification_queue table
- Partner integrations will use the partner_api_keys table

## Troubleshooting

### Extensions Not Found
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Permission Issues
Ensure the database user has necessary permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE atlast TO atlast;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO atlast;
```

### Connection Refused
Check that:
- PostgreSQL is running: `docker compose ps database`
- Port is exposed: `docker compose port database 5432`
- DATABASE_URL is correct: `postgresql://atlast:password@localhost:5432/atlast`
