# ATlast Importer - Browser Extension

Browser extension for importing Twitter/X follows to find them on Bluesky.

## Development

**Prerequisites:**
- ATlast dev server must be running at `http://127.0.0.1:8888`
- You must be logged in to ATlast before using the extension

### Build Extension

```bash
# From project root:
cd packages/extension
pnpm install
pnpm run build        # Dev build (uses http://127.0.0.1:8888)
pnpm run build:prod   # Production build (uses https://atlast.byarielm.fyi)
```

The built extension will be in `dist/chrome/`.

### Load in Chrome for Testing

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `packages/extension/dist/chrome/` directory
5. The extension should now appear in your extensions list

### Testing the Extension

#### Step 0: Start ATlast Dev Server

```bash
# From project root:
npx netlify-cli dev --filter @atlast/web
# Server will start at http://127.0.0.1:8888
```

Then open `http://127.0.0.1:8888` and log in with your Bluesky handle.

#### Step 1: Navigate to Twitter Following Page

1. Open Twitter/X in a new tab
2. Go to `https://x.com/{your-username}/following`
   - Replace `{your-username}` with your actual Twitter username
   - Example: `https://x.com/jack/following`

#### Step 2: Open Extension Popup

1. Click the ATlast Importer icon in your browser toolbar
2. You should see **"Ready to scan Twitter/X"** state
   - If you see "Go to x.com/following to start", the page wasn't detected correctly
   - Check the browser console for `[ATlast]` log messages to debug

#### Step 3: Scan Following Page

1. Click **Start Scan** button
2. The extension will:
   - Scroll the page automatically
   - Collect usernames as it scrolls
   - Show progress (e.g., "Found 247 users...")
3. Wait for "Scan complete!" message

#### Step 4: Upload to ATlast

1. Click **Open in ATlast** button
2. Extension will:
   - POST usernames to ATlast API
   - Open ATlast in a new tab with `?importId=xxx`
3. ATlast web app will:
   - Load the import data
   - Start searching Bluesky automatically
   - Show results page

### Debugging

#### Enable Console Logs

Open Chrome DevTools (F12) and check the Console tab for `[ATlast]` messages:

**Content Script logs** (on x.com pages):
```
[ATlast] Content script loaded
[ATlast] Current URL: https://x.com/username/following
[ATlast] Host: x.com
[ATlast] Path: /username/following
[ATlast] ✅ Detected Twitter/X following page
[ATlast] ✅ Notified background: ready state
```

**Background Worker logs** (in extension service worker):
```
[Background] Received message: STATE_UPDATE
[Background] State updated: {status: 'ready', platform: 'twitter', pageType: 'following'}
```

**Popup logs** (when extension popup is open):
```
[Popup] Initializing...
[Popup] Updating UI: {status: 'ready', platform: 'twitter'}
[Popup] Ready
```

#### Common Issues

**Issue: Extension shows "Not logged in to ATlast"**

Solution:
1. Open `http://127.0.0.1:8888` in a new tab
2. Log in with your Bluesky handle
3. Return to extension and click "Check Again"

**Issue: Extension shows "ATlast server not running"**

Solution:
1. Start dev server: `npx netlify-cli dev --filter @atlast/web`
2. Wait for server to start at `http://127.0.0.1:8888`
3. Click "Check Again" in extension

**Issue: Popup shows "Go to x.com/following" even when on following page**

Possible causes:
1. Content script didn't load (check for console errors)
2. URL pattern didn't match (check console for pattern mismatch)
3. Background worker didn't receive state update

Debug steps:
1. Open DevTools Console on the Twitter page
2. Look for `[ATlast] Content script loaded` message
3. Check if pattern matched: `[ATlast] ✅ Detected Twitter/X following page`
4. If no detection, check `[ATlast] Supported patterns` output

**Issue: Extension doesn't show in toolbar**

1. Go to `chrome://extensions`
2. Verify ATlast Importer is enabled
3. Click the puzzle piece icon (extensions menu)
4. Pin ATlast Importer to toolbar

**Issue: Scan doesn't find any users**

1. Make sure you're scrolled to the top of the following page
2. Check that usernames are visible on the page (not loading state)
3. Open Console and look for scraping logs during scan

## Production Build

For production deployment (Chrome Web Store):

```bash
cd packages/extension
pnpm run build:prod  # Uses production API URL
cd dist/chrome
zip -r ../chrome.zip .
```

Upload `dist/chrome.zip` to Chrome Web Store.

**Note:** Production build connects to `https://atlast.byarielm.fyi` instead of local dev server.

## Architecture

- **Content Script** (`src/content/index.ts`) - Runs on x.com, detects page, scrapes usernames
- **Background Worker** (`src/background/service-worker.ts`) - Manages state, coordinates messaging
- **Popup UI** (`src/popup/`) - User interface when clicking extension icon
- **Scrapers** (`src/content/scrapers/`) - Platform-specific scraping logic (Twitter, future: Threads, etc.)
- **Messaging** (`src/lib/messaging.ts`) - Communication between components
- **API Client** (`src/lib/api-client.ts`) - Uploads data to ATlast API

## Future Enhancements

- Firefox support (Manifest V2/V3 compatibility)
- Threads.net scraper
- Instagram scraper
- TikTok scraper
- Auto-navigate to following page button
- Username detection from DOM
- Safari extension (via iOS app wrapper)
