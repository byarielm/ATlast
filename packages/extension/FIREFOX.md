# Firefox Extension Installation Guide

The ATlast Importer extension now supports both Chrome and Firefox!

## Building for Firefox

The build system automatically creates both Chrome and Firefox versions:

```bash
pnpm run build        # Development build for both browsers
pnpm run build:prod   # Production build for both browsers
```

Output directories:
- `dist/chrome/` - Chrome/Edge version (Manifest V3 with service worker)
- `dist/firefox/` - Firefox version (Manifest V3 with scripts array)

## Installing in Firefox (Development)

### Option 1: Temporary Installation (for testing)

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to `packages/extension/dist/firefox/`
5. Select the `manifest.json` file

**Note:** Temporary extensions are removed when Firefox restarts.

### Option 2: Loading from ZIP (for distribution)

1. Build the production version:
   ```bash
   pnpm run build:prod
   pnpm run package:firefox
   ```

2. This creates `dist/firefox.zip`

3. For testing:
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select the `firefox.zip` file

4. For publishing:
   - Submit `firefox.zip` to [addons.mozilla.org](https://addons.mozilla.org/developers/)

## Key Differences from Chrome Version

### Manifest Differences

**Chrome (`manifest.chrome.json`):**
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  }
}
```

**Firefox (`manifest.firefox.json`):**
```json
{
  "manifest_version": 3,
  "background": {
    "scripts": ["background/service-worker.js"],
    "type": "module"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "atlast-importer@byarielm.fyi",
      "strict_min_version": "109.0"
    }
  }
}
```

### Cross-Browser Compatibility

- All code uses `webextension-polyfill` library
- Chrome-specific `chrome.*` APIs replaced with unified `browser.*` API
- Promise-based instead of callback-based
- Single codebase works across both browsers

### Requirements

- **Firefox:** Version 109+ (for Manifest V3 support)
- **Chrome/Edge:** Latest version

## Testing

After loading the extension in Firefox:

1. Navigate to Twitter/X Following page (e.g., `https://twitter.com/username/following`)
2. Click the extension icon in the toolbar
3. The popup should show "Ready to scan" state
4. Click "Start Scan" to scrape usernames
5. Click "Open on ATlast" to upload results

## Debugging

### View Console Logs

**Background Script:**
- Go to `about:debugging#/runtime/this-firefox`
- Find "ATlast Importer" in the list
- Click "Inspect"

**Popup:**
- Right-click extension icon → "Inspect Extension"

**Content Script:**
- Open DevTools on Twitter/X page (F12)
- Look for `[ATlast]` prefixed logs in Console

### Common Issues

1. **Extension not loading:**
   - Check Firefox version is 109+
   - Ensure manifest.json is valid
   - Check browser console for errors

2. **Scan not starting:**
   - Verify you're on Twitter/X Following page
   - Check content script is injected (look for console logs)
   - Ensure page is fully loaded

3. **"Server offline" message:**
   - Make sure dev server is running (`netlify dev`)
   - Check API URL in extension settings

## Packaging for Distribution

Create production builds for both browsers:

```bash
pnpm run package:prod
```

This creates:
- `dist/chrome.zip` - Ready for Chrome Web Store
- `dist/firefox.zip` - Ready for Firefox Add-ons

## Development Workflow

```bash
# Watch mode (auto-rebuild on changes)
pnpm run dev

# In Firefox:
# 1. about:debugging → Reload extension after each rebuild
# 2. Or use web-ext for auto-reload:

npx web-ext run --source-dir=dist/firefox
```

## Differences You Might Notice

1. **Background page persistence:**
   - Chrome: Service worker (non-persistent)
   - Firefox: Scripts array (similar behavior in MV3)

2. **API behavior:**
   - Firefox: Native Promise support
   - Chrome: Promises via polyfill

3. **Extension ID:**
   - Chrome: Auto-generated
   - Firefox: Explicitly set as `atlast-importer@byarielm.fyi`

Both versions use the same source code and should behave identically!
