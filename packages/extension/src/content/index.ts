import { TwitterScraper } from './scrapers/twitter-scraper.js';
import type { BaseScraper, ScraperErrorContext } from './scrapers/base-scraper.js';
import {
  MessageType,
  onMessage,
  sendToBackground,
  type Message,
  type ScrapeStartMessage,
  type ScrapeProgressMessage,
  type ScrapeCompleteMessage,
  type ScrapeErrorMessage
} from '../lib/messaging.js';
import { categorizeError, detectCommonScenarios, type ErrorContext } from '../lib/errors.js';

/**
 * Platform configuration
 */
interface PlatformConfig {
  platform: string;
  displayName: string;
  hostPatterns: string[];
  followingPathPattern: RegExp;
  createScraper: () => BaseScraper;
}

/**
 * Platform configurations
 */
const PLATFORMS: PlatformConfig[] = [
  {
    platform: 'twitter',
    displayName: 'Twitter/X',
    hostPatterns: ['twitter.com', 'x.com'],
    // Match /username/following or /following with optional trailing slash
    followingPathPattern: /^\/?([^/]+\/)?following\/?$/,
    createScraper: () => new TwitterScraper()
  }
  // Future platforms can be added here:
  // {
  //   platform: 'threads',
  //   displayName: 'Threads',
  //   hostPatterns: ['threads.net'],
  //   followingPathPattern: /^\/@[^/]+\/following$/,
  //   createScraper: () => new ThreadsScraper()
  // }
];

/**
 * Detect current platform from URL
 */
function detectPlatform(): { config: PlatformConfig; pageType: string } | null {
  const host = window.location.hostname;
  const path = window.location.pathname;

  for (const config of PLATFORMS) {
    if (config.hostPatterns.some(pattern => host.includes(pattern))) {
      if (config.followingPathPattern.test(path)) {
        return { config, pageType: 'following' };
      }
    }
  }

  return null;
}

/**
 * Current scraper instance
 */
let currentScraper: BaseScraper | null = null;
let isScraperRunning = false;

/**
 * Start scraping
 */
async function startScraping(): Promise<void> {
  if (isScraperRunning) {
    console.log('[ATlast] Scraper already running');
    return;
  }

  const detection = detectPlatform();
  if (!detection) {
    throw new Error('Not on a supported Following page');
  }

  const { config, pageType } = detection;

  // Notify background that scraping is starting
  const startMessage: ScrapeStartMessage = {
    type: MessageType.SCRAPE_START,
    payload: {
      platform: config.platform,
      pageType,
      url: window.location.href
    }
  };
  await sendToBackground(startMessage);

  isScraperRunning = true;

  // Create scraper with callbacks
  currentScraper = config.createScraper();

  const scraper = config.createScraper();

  // Track progress for error context
  let lastUsersFound = 0;

  scraper.onProgress = (progress) => {
    lastUsersFound = progress.count;
    const progressMessage: ScrapeProgressMessage = {
      type: MessageType.SCRAPE_PROGRESS,
      payload: progress
    };
    sendToBackground(progressMessage);
  };

  scraper.onComplete = (result) => {
    const completeMessage: ScrapeCompleteMessage = {
      type: MessageType.SCRAPE_COMPLETE,
      payload: result
    };
    sendToBackground(completeMessage);
    isScraperRunning = false;
    currentScraper = null;
  };

  scraper.onError = (error, scraperContext?: ScraperErrorContext) => {
    // Build complete error context
    const errorContext: ErrorContext = {
      usersFound: lastUsersFound,
      scrollAttempts: scraperContext?.scrollAttempts || 0,
      timeElapsed: scraperContext?.timeElapsed || 0,
      pageUrl: scraperContext?.pageUrl || window.location.href
    };

    // Check for common scenarios first
    let categorized = detectCommonScenarios(errorContext);

    // If no common scenario detected, categorize the error
    if (!categorized) {
      categorized = categorizeError(error, errorContext);
    }

    const errorMessage: ScrapeErrorMessage = {
      type: MessageType.SCRAPE_ERROR,
      payload: {
        error: categorized.technicalMessage,
        category: categorized.category,
        userMessage: categorized.userMessage,
        troubleshootingTips: categorized.troubleshootingTips
      }
    };
    sendToBackground(errorMessage);
    isScraperRunning = false;
    currentScraper = null;
  };

  // Start scraping
  try {
    await scraper.scrape();
  } catch (error) {
    console.error('[ATlast] Scraping error:', error);
  }
}

/**
 * Listen for messages from popup/background
 */
onMessage(async (message: Message) => {
  if (message.type === MessageType.START_SCRAPE) {
    await startScraping();
  }
});

/**
 * Notify background of current page on load
 */
(function init() {
  const host = window.location.hostname;
  const path = window.location.pathname;

  console.log('[ATlast] Content script loaded');
  console.log('[ATlast] Current URL:', window.location.href);
  console.log('[ATlast] Host:', host);
  console.log('[ATlast] Path:', path);

  const detection = detectPlatform();

  if (detection) {
    console.log(`[ATlast] ✅ Detected ${detection.config.displayName} ${detection.pageType} page`);

    // Notify background that we're on a supported page
    sendToBackground({
      type: MessageType.STATE_UPDATE,
      payload: {
        status: 'ready',
        platform: detection.config.platform,
        pageType: detection.pageType
      }
    }).then(() => {
      console.log('[ATlast] ✅ Notified background: ready state');
    }).catch(err => {
      console.error('[ATlast] ❌ Failed to notify background:', err);
    });
  } else {
    console.log('[ATlast] ℹ️ Not on a supported page');
    console.log('[ATlast] Supported patterns:', PLATFORMS.map(p => ({
      platform: p.platform,
      hosts: p.hostPatterns,
      pattern: p.followingPathPattern.toString()
    })));
  }
})();
