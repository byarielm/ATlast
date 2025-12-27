# ATlast Twitter/X Support Plan

## Current Status (2025-12-27)

**Phase 1 Status:** ✅ COMPLETE - Ready for production testing and Chrome Web Store submission

**All Completed (Dec 2024 - Jan 2025):**
- ✅ Environment configuration (dev/prod builds with correct API URLs)
- ✅ Server health check and offline state handling
- ✅ Authentication flow (session check before upload)
- ✅ Removed temporary storage approach (extension_imports table)
- ✅ Refactored to require login first (matches file upload flow)
- ✅ Fixed NaN database error (missing matchedUsers parameter)
- ✅ Database initialized for dev environment
- ✅ Fixed API response unwrapping (uploadToATlast and checkSession)
- ✅ Loading screen during extension upload search
- ✅ Timezone fixes with TIMESTAMPTZ
- ✅ Vite dev server optimization
- ✅ Decision graph integrity fixes (18 orphan nodes resolved)
- ✅ Documentation improvements (CLAUDE.md with lifecycle management)

**Ready For:**
- Production testing
- Chrome Web Store submission
- Firefox Add-ons development

**Decision Graph:** 332 nodes, 333 edges - [View live graph](https://notactuallytreyanastasio.github.io/deciduous/)

---

## Problem Statement

Twitter/X data exports only contain `user_id` values, not usernames. Example:
```
https://twitter.com/intent/user?user_id=1103954565026775041
```

This makes data export files unusable for our existing parser-based workflow. We need a live scraping approach to extract usernames from the user's Following page.

## Research Findings

### Why Data Export Doesn't Work
- Twitter exports contain only numeric `user_id` in URLs
- Resolving `user_id` → `screen_name` requires API access ($42k/year Enterprise tier) or scraping
- Nitter is dead (Feb 2024) - Twitter killed guest accounts
- Third-party ID lookup tools don't support bulk/API access

### Live Scraping Approach
Users are typically logged into Twitter. We can scrape usernames directly from the DOM of `x.com/following` using stable selectors:
- `[data-testid="UserName"]` - stable, recommended
- CSS class selectors - volatile, change frequently

### Platform Support Matrix

| Platform | Extension Support | Bookmarklet JS | Solution |
|----------|------------------|----------------|----------|
| Desktop Chrome/Edge | Full | Yes | WebExtension |
| Desktop Firefox | Full | Yes | WebExtension |
| Desktop Safari | Full | Yes | WebExtension |
| Android Firefox | Full | Yes | WebExtension |
| Android Chrome | None | Via address bar | Recommend Firefox |
| iOS Safari | Via App Store app | Blocked since iOS 15 | Safari Web Extension |

### iOS-Specific Findings

**iOS Shortcuts "Run JavaScript on Webpage":**
- CAN access authenticated Safari session via Share Sheet
- BUT has strict timeout (few seconds)
- Infinite scroll would timeout immediately
- Only viable for grabbing currently visible content

**iOS Safari Web Extensions (iOS 15+):**
- Uses same WebExtensions API as Chrome/Firefox
- Content scripts run without timeout limits
- REQUIRES App Store distribution as part of iOS app
- Full capability: auto-scroll, scrape, upload

## Architecture Decisions

### Monorepo Structure (pnpm workspaces)

```
ATlast/
├── pnpm-workspace.yaml
├── package.json                      # Root workspace config
├── packages/
│   ├── web/                          # Existing web app (moved from src/)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── extension/                    # ATlast Importer browser extension
│   │   ├── src/
│   │   ├── manifest.json
│   │   ├── package.json
│   │   └── build.config.ts
│   ├── shared/                       # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── platform.ts       # Platform enum, configs
│   │   │   │   ├── import.ts         # Import request/response types
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       └── username.ts       # Username normalization
│   │   └── package.json
│   └── functions/                    # Netlify functions (moved from netlify/)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── netlify.toml
└── docs/                             # Decision graph output
```

### Extension Name
**ATlast Importer** - Clear purpose, searchable in extension stores.

### WebExtension Targets
- Chrome/Edge (Manifest V3)
- Firefox (Manifest V2/V3)
- Safari (desktop + iOS via App Store wrapper) - deferred

---

## Extension Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ATlast Browser Extension                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Popup UI   │    │   Content    │    │  Background  │       │
│  │              │◄──►│   Script     │◄──►│   Service    │       │
│  │  - Status    │    │              │    │   Worker     │       │
│  │  - Progress  │    │  - Scrape    │    │              │       │
│  │  - Actions   │    │  - Scroll    │    │  - Storage   │       │
│  └──────────────┘    │  - Collect   │    │  - Messaging │       │
│                      └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ATlast Web App │
                    │                  │
                    │  - Receive data  │
                    │  - Search Bsky   │
                    │  - Show matches  │
                    └──────────────────┘
```

### Component Breakdown

#### 1. Manifest Configuration
```
extension/
├── manifest.json          # Extension manifest (V3 for Chrome, V2 for Firefox)
├── manifest.firefox.json  # Firefox-specific overrides (if needed)
└── manifest.safari.json   # Safari-specific overrides (if needed)
```

#### 2. Content Script (`content.js`)
Injected into `x.com` / `twitter.com` pages.

**Responsibilities:**
- Detect if on Following/Followers page
- Auto-scroll to load all users
- Extract usernames using `[data-testid="UserName"]`
- Report progress to popup/background
- Handle rate limiting and pagination

**Scraping Logic (pseudo-code):**
```javascript
async function scrapeFollowing() {
  const usernames = new Set();
  let lastCount = 0;
  let stableCount = 0;

  while (stableCount < 3) {  // Stop after 3 scrolls with no new users
    // Collect visible usernames
    document.querySelectorAll('[data-testid="UserName"]').forEach(el => {
      const username = extractUsername(el);
      if (username) usernames.add(username);
    });

    // Report progress
    sendProgress(usernames.size);

    // Scroll down
    window.scrollBy(0, 1000);
    await sleep(500);

    // Check if we found new users
    if (usernames.size === lastCount) {
      stableCount++;
    } else {
      stableCount = 0;
      lastCount = usernames.size;
    }
  }

  return Array.from(usernames);
}
```

#### 3. Popup UI (`popup.html`, `popup.js`)
User interface when clicking extension icon.

**States:**
- **Inactive**: "Go to x.com/following to start"
- **Ready**: "Found Following page. Click to scan."
- **Scanning**: Progress bar, count of found users
- **Complete**: "Found 847 users. Open in ATlast"
- **Error**: Error message with retry option

#### 4. Background Service Worker (`background.js`)
Coordinates between content script and popup.

**Responsibilities:**
- Store scraped data temporarily
- Handle cross-tab communication
- Manage extension state
- Generate handoff URL/data for ATlast

### Data Handoff to ATlast

**Decision: POST to API endpoint**

Extension will POST scraped usernames to a new Netlify function endpoint.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    Extension    │  POST   │  Netlify Func   │  Store  │    Database     │
│                 │────────►│  /extension-    │────────►│                 │
│  usernames[]    │         │   import        │         │  pending_import │
│  platform: "x"  │         │                 │         │                 │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                     │
                                     │ Returns: { importId: "abc123" }
                                     ▼
                            ┌─────────────────┐
                            │   Redirect to   │
                            │  atlast.app/    │
                            │  import/abc123  │
                            └─────────────────┘
```

**API Endpoint: `POST /extension-import`**

Request:
```json
{
  "platform": "twitter",
  "usernames": ["user1", "user2", ...],
  "metadata": {
    "extensionVersion": "1.0.0",
    "scrapedAt": "2024-01-15T...",
    "pageType": "following"
  }
}
```

Response:
```json
{
  "importId": "abc123",
  "redirectUrl": "https://atlast.app/import/abc123"
}
```

**Why POST over other options:**
- No URL length limits (supports 10k+ usernames)
- Secure (HTTPS, can add rate limiting)
- Seamless UX (extension opens ATlast directly)
- Audit trail (imports stored in database)

### Extension Package Structure (`packages/extension/`)

```
packages/extension/
├── manifest.json                    # Base manifest (Chrome MV3)
├── manifest.firefox.json            # Firefox overrides (if needed)
├── package.json                     # Extension package config
├── tsconfig.json
├── build.config.ts                  # Build script config
├── src/
│   ├── content/
│   │   ├── scrapers/
│   │   │   ├── base-scraper.ts      # Abstract base class
│   │   │   ├── twitter-scraper.ts   # Twitter/X implementation
│   │   │   ├── threads-scraper.ts   # (Future) Threads
│   │   │   ├── instagram-scraper.ts # (Future) Instagram
│   │   │   └── tiktok-scraper.ts    # (Future) TikTok
│   │   ├── scroll-handler.ts        # Generic infinite scroll
│   │   └── index.ts                 # Content script entry, platform detection
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts
│   ├── background/
│   │   └── service-worker.ts
│   └── lib/
│       ├── messaging.ts             # Extension messaging
│       ├── storage.ts               # chrome.storage wrapper
│       └── api-client.ts            # POST to ATlast API
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── dist/
    ├── chrome/                      # Built extension for Chrome
    ├── firefox/                     # Built extension for Firefox
    └── chrome.zip                   # Store submission package
```

### Shared Package Structure (`packages/shared/`)

```
packages/shared/
├── package.json
├── tsconfig.json
├── src/
│   ├── types/
│   │   ├── platform.ts              # Platform enum, URL patterns
│   │   ├── import.ts                # ExtensionImportRequest, ExtensionImportResponse
│   │   ├── scraper.ts               # ScraperResult, ScraperProgress
│   │   └── index.ts                 # Re-exports
│   ├── utils/
│   │   ├── username.ts              # normalizeUsername(), validateUsername()
│   │   └── index.ts
│   └── index.ts                     # Main entry
└── dist/                            # Compiled output
```

### Shared Types Example

```typescript
// packages/shared/src/types/platform.ts
export enum Platform {
  Twitter = 'twitter',
  Threads = 'threads',
  Instagram = 'instagram',
  TikTok = 'tiktok',
}

export interface PlatformConfig {
  platform: Platform;
  displayName: string;
  hostPatterns: string[];
  followingPathPattern: RegExp;
  iconUrl: string;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  [Platform.Twitter]: {
    platform: Platform.Twitter,
    displayName: 'Twitter/X',
    hostPatterns: ['twitter.com', 'x.com'],
    followingPathPattern: /^\/[^/]+\/following$/,
    iconUrl: 'https://abs.twimg.com/favicons/twitter.ico',
  },
  // ... future platforms
};
```

```typescript
// packages/shared/src/types/import.ts
import { Platform } from './platform';

export interface ExtensionImportRequest {
  platform: Platform;
  usernames: string[];
  metadata: {
    extensionVersion: string;
    scrapedAt: string;
    pageType: 'following' | 'followers' | 'list';
    sourceUrl: string;
  };
}

export interface ExtensionImportResponse {
  importId: string;
  usernameCount: number;
  redirectUrl: string;
}
```

### Platform Detection & Extensibility

Content script detects platform from URL and loads appropriate scraper:

```javascript
// src/content/index.js
const PLATFORM_PATTERNS = {
  twitter: {
    hostPatterns: ['twitter.com', 'x.com'],
    followingPath: /^\/[^/]+\/following$/,
    scraper: () => import('./scrapers/twitter-scraper.js')
  },
  threads: {
    hostPatterns: ['threads.net'],
    followingPath: /^\/[^/]+\/following$/,
    scraper: () => import('./scrapers/threads-scraper.js')
  },
  // ... future platforms
};

function detectPlatform() {
  const host = window.location.hostname;
  const path = window.location.pathname;

  for (const [name, config] of Object.entries(PLATFORM_PATTERNS)) {
    if (config.hostPatterns.some(h => host.includes(h))) {
      if (config.followingPath.test(path)) {
        return { platform: name, pageType: 'following', ...config };
      }
    }
  }
  return null;
}
```

### Base Scraper Interface

```javascript
// src/content/scrapers/base-scraper.js
export class BaseScraper {
  constructor(options = {}) {
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
  }

  // Must be implemented by subclasses
  getUsernameSelector() { throw new Error('Not implemented'); }
  extractUsername(element) { throw new Error('Not implemented'); }

  // Shared infinite scroll logic
  async scrape() {
    const usernames = new Set();
    let stableCount = 0;

    while (stableCount < 3) {
      const before = usernames.size;

      document.querySelectorAll(this.getUsernameSelector()).forEach(el => {
        const username = this.extractUsername(el);
        if (username) usernames.add(username);
      });

      this.onProgress({ count: usernames.size });

      window.scrollBy(0, 1000);
      await this.sleep(500);

      stableCount = (usernames.size === before) ? stableCount + 1 : 0;
    }

    this.onComplete({ usernames: Array.from(usernames) });
    return Array.from(usernames);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Twitter Scraper Implementation

```javascript
// src/content/scrapers/twitter-scraper.js
import { BaseScraper } from './base-scraper.js';

export class TwitterScraper extends BaseScraper {
  getUsernameSelector() {
    // Primary selector (stable)
    return '[data-testid="UserName"]';
  }

  extractUsername(element) {
    // UserName element contains display name and @handle
    // Structure: <div><span>Display Name</span></div><div><span>@handle</span></div>
    const spans = element.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim();
      if (text?.startsWith('@')) {
        return text.slice(1).toLowerCase(); // Remove @ prefix
      }
    }
    return null;
  }
}
```

### iOS App Wrapper (Future)

For iOS Safari extension, need minimal Swift app:

```
ATlastApp/
├── ATlast/
│   ├── ATlastApp.swift           # Minimal app entry
│   ├── ContentView.swift         # Simple "Open Safari" UI
│   └── Info.plist
├── ATlast Extension/
│   ├── SafariWebExtensionHandler.swift
│   ├── Info.plist
│   └── Resources/
│       └── (same extension files as above)
└── ATlast.xcodeproj
```

---

## Decisions Made

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Data Handoff** | POST to API endpoint | No size limits, seamless UX, audit trail |
| **MVP Scope** | Twitter Following page only | Fastest path to value |
| **iOS Priority** | Deferred | Focus on desktop Chrome/Firefox first |
| **Platform Scope** | Twitter v1, architecture for multi-platform | Plan for Threads/Instagram/TikTok later |
| **Extension Name** | ATlast Importer | Clear purpose, searchable in stores |
| **Code Location** | Monorepo with pnpm workspaces | Clean shared types, isolated builds |
| **Monorepo Tool** | pnpm workspaces | Fast, disk-efficient, minimal config |

## Remaining Questions

### Q1: Extension Branding
- Name options: "ATlast", "ATlast Importer", "ATlast Social Bridge"
- Icon design needed

### Q2: Error Recovery Strategy
Twitter/X changes DOM frequently. Strategy for handling breaks:
- Ship updates quickly when breaks detected
- Build selector fallback chain
- User-reportable "not working" flow
- **Recommendation: All of the above**

### Q3: Extension Store Distribution
- Chrome Web Store (requires $5 developer fee)
- Firefox Add-ons (free)
- Safari Extensions (requires Apple Developer account, $99/year - defer with iOS)

---

## Implementation Phases

### Phase 0: Monorepo Migration ✅ COMPLETE
- [x] **0.1** Install pnpm globally if needed
- [x] **0.2** Create pnpm-workspace.yaml
- [x] **0.3** Create packages/ directory structure
- [x] **0.4** Move src/ → packages/web/src/
- [x] **0.5** Move netlify/functions/ → packages/functions/
- [x] **0.6** Create packages/shared/ with types
- [x] **0.7** Update import paths in web and functions
- [x] **0.8** Update netlify.toml for new paths
- [x] **0.9** Update root package.json scripts
- [x] **0.10** Test build and dev commands
- [x] **0.11** Commit monorepo migration

### Phase 1: Chrome Extension MVP ✅ COMPLETE
- [x] **1.1** Create packages/extension/ structure
- [x] **1.2** Write manifest.json (Manifest V3)
- [x] **1.3** Implement base-scraper.ts abstract class
- [x] **1.4** Implement twitter-scraper.ts
- [x] **1.5** Implement content/index.ts (platform detection)
- [x] **1.6** Implement popup UI (HTML/CSS/TS)
- [x] **1.7** Implement background service worker
- [x] **1.8** Implement api-client.ts (POST to ATlast)
- [x] **1.9** Create Netlify function: extension-import.ts
- [x] **1.10** ~~Create ATlast import page: /import/[id]~~ (Not needed - uses /results?uploadId)
- [x] **1.11** Add extension build script
- [x] **1.12** Test end-to-end flow locally - All bugs resolved
- [ ] **1.13** Chrome Web Store submission - Next step

### Phase 2: Firefox Support
- [ ] **2.1** Create manifest.firefox.json (MV2 if needed)
- [ ] **2.2** Test on Firefox desktop
- [ ] **2.3** Test on Firefox Android
- [ ] **2.4** Firefox Add-ons submission

### Phase 3: Enhanced Twitter Features
- [ ] **3.1** Support Followers page
- [ ] **3.2** Support Twitter Lists
- [ ] **3.3** Add selector fallback chain
- [ ] **3.4** Add user-reportable error flow

### Phase 4: Additional Platforms (Future)
- [ ] **4.1** Threads scraper
- [ ] **4.2** Instagram scraper
- [ ] **4.3** TikTok scraper

### Phase 5: iOS Support (Future)
- [ ] **5.1** iOS app wrapper (Swift)
- [ ] **5.2** Safari Web Extension integration
- [ ] **5.3** App Store submission

---

## Related Decision Graph Nodes

- **Goal**: #184 (Support Twitter/X file uploads)
- **Problem Analysis**: #185-186 (user_id issue, resolution approach decision)
- **Initial Options**: #187-192 (server-side, extension, CLI, BYOK, hybrid)
- **Research**: #193-204 (Nitter dead, Sky Follower Bridge, DOM scraping)
- **iOS Research**: #212-216 (Shortcuts timeout, Safari Web Extensions)
- **Architecture Decisions**: #218-222
  - #219: POST to API endpoint
  - #220: Twitter Following page MVP
  - #221: iOS deferred
  - #222: Multi-platform architecture
- **Implementation Decisions**: #224-227
  - #225: Monorepo with shared packages
  - #226: Extension name "ATlast Importer"
  - #227: pnpm workspaces tooling

View live graph: https://notactuallytreyanastasio.github.io/deciduous/

---

## Changelog

| Date | Change |
|------|--------|
| 2024-12-25 | Initial plan created with research findings and architecture |
| 2024-12-25 | Decisions made: POST API, Twitter MVP, iOS deferred, extensible architecture |
| 2024-12-25 | Added: Extension name (ATlast Importer), monorepo structure (pnpm workspaces) |
| 2024-12-25 | Added: Phase 0 (monorepo migration), detailed package structures, shared types |
| 2025-12-26 | Phase 0 complete (monorepo migration) |
| 2025-12-26 | Phase 1 nearly complete - core implementation done, active debugging |
| 2025-12-26 | Architecture refactored: extension requires login first, uses /results?uploadId |
| 2025-12-26 | Fixed: NaN database error, environment config, auth flow, CORS permissions |
| 2025-12-26 | Fixed: API response unwrapping - extension now correctly handles ApiResponse structure |
| 2025-12-26 | Phase 1 ready for testing - all bugs resolved, decision graph: 295 nodes tracked |
| 2025-12-27 | Phase 1 COMPLETE - all extension bugs fixed, ready for Chrome Web Store submission |
| 2025-12-27 | Added: Loading screen, timezone fixes, Vite optimization, decision graph improvements |
| 2025-12-27 | Decision graph: 332 nodes, 333 edges - orphan nodes resolved, documentation improved |
