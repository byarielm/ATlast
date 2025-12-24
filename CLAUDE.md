# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Instructions

## Decision Graph Workflow

**THIS IS MANDATORY. Log decisions IN REAL-TIME, not retroactively.**

### The Core Rule

```
BEFORE you do something -> Log what you're ABOUT to do
AFTER it succeeds/fails -> Log the outcome
CONNECT immediately -> Link every node to its parent
AUDIT regularly -> Check for missing connections
```

### Behavioral Triggers - MUST LOG WHEN:

| Trigger | Log Type | Example |
|---------|----------|---------|
| User asks for a new feature | `goal` **with -p** | "Add dark mode" |
| Choosing between approaches | `decision` | "Choose state management" |
| About to write/edit code | `action` | "Implementing Redux store" |
| Something worked or failed | `outcome` | "Redux integration successful" |
| Notice something interesting | `observation` | "Existing code uses hooks" |

### CRITICAL: Capture VERBATIM User Prompts

**Prompts must be the EXACT user message, not a summary.** When a user request triggers new work, capture their full message word-for-word.

**BAD - summaries are useless for context recovery:**
```bash
# DON'T DO THIS - this is a summary, not a prompt
deciduous add goal "Add auth" -p "User asked: add login to the app"
```

**GOOD - verbatim prompts enable full context recovery:**
```bash
# Use --prompt-stdin for multi-line prompts
deciduous add goal "Add auth" -c 90 --prompt-stdin << 'EOF'
I need to add user authentication to the app. Users should be able to sign up
with email/password, and we need OAuth support for Google and GitHub. The auth
should use JWT tokens with refresh token rotation.
EOF

# Or use the prompt command to update existing nodes
deciduous prompt 42 << 'EOF'
The full verbatim user message goes here...
EOF
```

**When to capture prompts:**
- Root `goal` nodes: YES - the FULL original request
- Major direction changes: YES - when user redirects the work
- Routine downstream nodes: NO - they inherit context via edges

**Updating prompts on existing nodes:**
```bash
deciduous prompt <node_id> "full verbatim prompt here"
cat prompt.txt | deciduous prompt <node_id>  # Multi-line from stdin
```

Prompts are viewable in the TUI detail panel (`deciduous tui`) and web viewer.

### ⚠️ CRITICAL: Maintain Connections

**The graph's value is in its CONNECTIONS, not just nodes.**

| When you create... | IMMEDIATELY link to... |
|-------------------|------------------------|
| `outcome` | The action/goal it resolves |
| `action` | The goal/decision that spawned it |
| `option` | Its parent decision |
| `observation` | Related goal/action |

**Root `goal` nodes are the ONLY valid orphans.**

### Quick Commands

```bash
deciduous add goal "Title" -c 90 -p "User's original request"
deciduous add action "Title" -c 85
deciduous link FROM TO -r "reason"  # DO THIS IMMEDIATELY!
deciduous serve   # View live (auto-refreshes every 30s)
deciduous sync    # Export for static hosting

# Metadata flags
# -c, --confidence 0-100   Confidence level
# -p, --prompt "..."       Store the user prompt (use when semantically meaningful)
# -f, --files "a.rs,b.rs"  Associate files
# -b, --branch <name>      Git branch (auto-detected)
# --commit <hash|HEAD>     Link to git commit (use HEAD for current commit)

# Branch filtering
deciduous nodes --branch main
deciduous nodes -b feature-auth
```

### ⚠️ CRITICAL: Link Commits to Actions/Outcomes

**After every git commit, link it to the decision graph!**

```bash
git commit -m "feat: add auth"
deciduous add action "Implemented auth" -c 90 --commit HEAD
deciduous link <goal_id> <action_id> -r "Implementation"
```

The `--commit HEAD` flag captures the commit hash and links it to the node. The web viewer will show commit messages, authors, and dates.

### Git Commit Message Format

**Keep commit messages clean and concise:**
- NO "Generated with Claude Code" or similar by-lines
- NO "Co-Authored-By:" lines
- NO "Files updated:" sections or file lists
- Use concise summary line describing the change
- Add additional details if needed, but keep it focused

**Example:**
```bash
git commit -m "remove deprecated 'followed' field and cleanup codebase

Removed backward compatibility code for deprecated 'followed' field:
- Removed from AtprotoMatch type
- Updated 6 files to use only followStatus Record
- Replaced simple boolean check with multi-lexicon support
- Database schema preserved (no migration needed)

Also removed empty 'nul' file created accidentally."
```

### Git History & Deployment

```bash
# Export graph AND git history for web viewer
deciduous sync

# This creates:
# - docs/graph-data.json (decision graph)
# - docs/git-history.json (commit info for linked nodes)
```

To deploy to GitHub Pages:
1. `deciduous sync` to export
2. Push to GitHub
3. Settings > Pages > Deploy from branch > /docs folder

Your graph will be live at `https://<user>.github.io/<repo>/`

### Branch-Based Grouping

Nodes are auto-tagged with the current git branch. Configure in `.deciduous/config.toml`:
```toml
[branch]
main_branches = ["main", "master"]
auto_detect = true
```

### Audit Checklist (Before Every Sync)

1. Does every **outcome** link back to what caused it?
2. Does every **action** link to why you did it?
3. Any **dangling outcomes** without parents?

### Session Start Checklist

```bash
deciduous nodes    # What decisions exist?
deciduous edges    # How are they connected? Any gaps?
git status         # Current state
```

### Multi-User Sync

Share decisions across teammates:

```bash
# Export your branch's decisions
deciduous diff export --branch feature-x -o .deciduous/patches/my-feature.json

# Apply patches from teammates (idempotent)
deciduous diff apply .deciduous/patches/*.json

# Preview before applying
deciduous diff apply --dry-run .deciduous/patches/teammate.json
```

PR workflow: Export patch → commit patch file → PR → teammates apply.

### API Trace Capture

Capture Claude API traffic to correlate decisions with actual API work:

```bash
# Run Claude through the deciduous proxy
deciduous proxy -- claude

# View traces in TUI (press 't' for Trace view)
deciduous tui

# View traces in web viewer (click "Traces" tab)
deciduous serve
```

**Auto-linking**: When running through `deciduous proxy`, any `deciduous add` commands automatically link to the active API span. You'll see output like:

```
Created action #42 "Implementing auth" [traced: span #7]
```

This lets you see exactly which API calls produced which decisions - perfect for "vibe coding" visibility.

**Trace commands:**
```bash
deciduous trace sessions              # List all sessions
deciduous trace spans <session_id>    # List spans in a session
deciduous trace link <session_id> <node_id>   # Manual linking
deciduous trace prune --days 30       # Cleanup old traces
```

## Project Overview

ATlast is a web application that helps users find their followed accounts from other social platforms (TikTok, Instagram, Twitter/X) on Bluesky/AT Protocol. Users upload their data export files, which are parsed for usernames, then searched in the AT Protocol network.

## Development Commands

### Local Development
```bash
# Mock mode (frontend only, no backend/OAuth/database)
npm run dev:mock

# Full mode (with backend, OAuth, database)
npm run dev:full    # or npm run dev

# Build for production
npm run build

# Initialize local database
npm run init-db

# Generate encryption keys for OAuth
npm run generate-key
```

### Environment Configuration

Two development modes supported:

**Mock Mode** (.env.mock):
- Set `VITE_LOCAL_MOCK=true`
- No database or OAuth required
- Uses MockApiAdapter for fake data

**Full Mode** (.env):
- Set `VITE_LOCAL_MOCK=false`
- Requires PostgreSQL (local or Neon)
- Requires OAuth keys and configuration
- Must use `http://127.0.0.1:8888` (NOT localhost) for OAuth to work
- See CONTRIBUTING.md for detailed setup

## Architecture Overview

### Frontend (React + TypeScript + Vite)

**Core Structure:**
- `src/pages/` - Page components (Login, Upload, Results, etc.)
- `src/components/` - Reusable UI components
- `src/lib/parsers/` - File parsing logic for different platforms
- `src/lib/api/` - API client with adapter pattern (Real vs Mock)
- `src/contexts/` - React contexts (SettingsContext for theme/preferences)
- `src/hooks/` - Custom React hooks

**API Client Pattern:**
The app uses an adapter pattern for the API layer:
- `src/lib/api/client.ts` - Factory that returns Real or Mock adapter based on ENV.IS_LOCAL_MOCK
- `src/lib/api/adapters/RealApiAdapter.ts` - Calls Netlify Functions
- `src/lib/api/adapters/MockApiAdapter.ts` - Returns fake data for frontend development
- `src/lib/api/IApiClient.ts` - Interface both adapters implement

**Platform Parsers:**
- `src/lib/parsers/platformDefinitions.ts` - Defines parsing rules for each platform (Instagram, TikTok, etc.)
- `src/lib/parsers/fileExtractor.ts` - Handles ZIP file uploads and extracts usernames
- `src/lib/parsers/parserLogic.ts` - Implements extraction logic (HTML regex, JSON path traversal, TEXT regex)

Each platform has multiple ParseRule entries defining:
- `zipPath` - Location inside ZIP archive
- `format` - "HTML" | "TEXT" | "JSON"
- `rule` - Regex pattern string or JSON key path array

### Backend (Netlify Functions)

**Function Structure:**
```
netlify/functions/
├── core/
│   ├── middleware/        # Auth, error handling, session security
│   ├── types/            # Shared types
│   ├── errors/           # Custom error classes
│   └── config/           # Configuration
├── infrastructure/
│   ├── oauth/            # OAuth client factory, stores
│   ├── database/         # Database connection, service layer
│   ├── cache/            # Caching utilities
│   └── lexicons/         # AT Protocol lexicons
├── services/             # Business logic (SessionService, FollowService, etc.)
├── repositories/         # Data access layer
└── utils/                # Shared utilities
```

**Key Functions:**
- `oauth-start.ts` / `oauth-callback.ts` - AT Protocol OAuth flow
- `session.ts` - Session management and validation
- `batch-search-actors.ts` - Searches multiple usernames on Bluesky (includes ranking algorithm)
- `check-follow-status.ts` - Checks if user follows specific DIDs
- `batch-follow-users.ts` - Bulk follow operations
- `save-results.ts` - Persists search results to database
- `get-uploads.ts` - Retrieves user's upload history

**Authentication Pattern:**
All protected endpoints use:
1. `withAuthErrorHandling()` middleware wrapper
2. `AuthenticatedHandler` type (provides `context.sessionId`, `context.did`, `context.event`)
3. `SessionService.getAgentForSession()` to get authenticated AT Protocol agent

**Database:**
- PostgreSQL via Neon serverless
- Accessed through `DatabaseService` (infrastructure/database/)
- Repositories pattern for data access (repositories/)

**OAuth:**
- AT Protocol OAuth using `@atproto/oauth-client-node`
- OAuth client factory creates client with session/state stores
- Private key (ES256) stored in `OAUTH_PRIVATE_KEY` env var
- Public JWK served at `/jwks` endpoint
- Must use `127.0.0.1` (not localhost) for local OAuth redirects

### UI/Styling

**Tailwind CSS with dual theme support:**
- Light mode: purple/cyan color scheme
- Dark mode: cyan/purple inverted
- All components use `dark:` variant classes

**Color System (from CONTRIBUTING.md):**
- Text: purple-950/cyan-50 (primary), purple-750/cyan-250 (secondary)
- Borders: cyan-500/purple-500 with opacity variants
- Buttons: orange-600 (primary CTA), slate-600/700 (secondary)
- Backgrounds: white/slate-900 (primary), purple-50/slate-900 (secondary)
- Selected states: cyan-50 border-cyan-500 / purple-950/30 border-purple-500
- Accents: orange-500/amber-500 (badges, progress)

**Key Patterns:**
- Mobile-first responsive design
- List virtualization with `@tanstack/react-virtual` for large result sets
- Code splitting and lazy loading for pages
- Error boundaries throughout the app
- Loading skeletons for async operations

### Search & Matching Algorithm

**Username Matching (batch-search-actors.ts):**
The search uses a scoring system (0-100):
1. Exact handle match (before first dot): 100
2. Exact full handle match: 90
3. Exact display name match: 80
4. Partial handle match (contains): 60
5. Partial full handle match: 50
6. Partial display name match: 40
7. Reverse partial match: 30

All comparisons use normalized strings (lowercase, no special chars).
Returns top 5 ranked results per username.

**Result Enrichment:**
- Fetches profiles in batches of 25 for post/follower counts
- Checks follow status using custom lexicons (default: `app.bsky.graph.follow`)
- Attaches follow status to each actor result

## Key Technical Details

### AT Protocol Integration
- Uses `@atproto/api` for Bluesky API interactions
- Uses `@atcute/identity-resolver` for DID resolution
- Supports custom lexicons for experimental features
- OAuth flow follows AT Protocol OAuth spec

### File Upload Flow
1. User uploads ZIP file (Instagram/TikTok data export)
2. `fileExtractor.ts` reads ZIP in browser (using JSZip)
3. Matches file paths to platform rules from `platformDefinitions.ts`
4. `parserLogic.ts` extracts usernames (regex for HTML/TEXT, path traversal for JSON)
5. Deduplicates and returns username list
6. Frontend calls `/batch-search-actors` with username batches (max 50)
7. Results stored in database via `/save-results`

### Session Management
- Session IDs stored in httpOnly cookies
- Sessions linked to encrypted OAuth state stores
- Session validation middleware checks database and expiry
- Sessions tied to specific DIDs (user accounts)

### Deployment
- Hosted on Netlify
- Static frontend built with Vite
- Serverless functions for backend
- Database on Neon (PostgreSQL)
- OAuth redirects configured in netlify.toml

## Adding New Features

### Adding a New Social Platform
1. Add parsing rules to `src/lib/parsers/platformDefinitions.ts`:
```typescript
export const PLATFORM_RULES: Record<string, ParseRule[]> = {
  newplatform: [
    {
      zipPath: "path/in/zip/file.json",
      format: "JSON",
      rule: ["key", "path", "to", "username"],
    },
  ],
};
```
2. Test with real data export from that platform
3. Update UI in platform selection components

### Adding a New API Endpoint
1. Create function in `netlify/functions/your-endpoint.ts`
2. Use `withAuthErrorHandling()` for protected endpoints
3. Implement `AuthenticatedHandler` type
4. Add method to `IApiClient.ts` interface
5. Implement in both `RealApiAdapter.ts` and `MockApiAdapter.ts`
6. Use via `apiClient.yourMethod()` in components

### Adding Database Models
1. Create migration script in `scripts/`
2. Run against local database
3. Update repository in `netlify/functions/repositories/`
4. Update DatabaseService if needed

## Important Notes

- **OAuth Localhost Issue**: Must use `127.0.0.1:8888` not `localhost:8888` for local OAuth to work
- **Batch Limits**: Search endpoint limited to 50 usernames per request
- **Profile Fetching**: Batched in groups of 25 to avoid rate limits
- **Normalization**: All username comparisons use lowercase + special char removal
- **Security**: CSP headers configured in netlify.toml, session security middleware prevents CSRF
- **Error Handling**: Custom error classes (ValidationError, AuthenticationError, etc.) with proper HTTP status codes
