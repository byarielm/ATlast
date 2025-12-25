import { TwitterScraper } from './scrapers/twitter-scraper.js';
import type { BaseScraper } from './scrapers/base-scraper.js';
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
    followingPathPattern: /^\/[^/]+\/following$/,
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

  scraper.onProgress = (progress) => {
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

  scraper.onError = (error) => {
    const errorMessage: ScrapeErrorMessage = {
      type: MessageType.SCRAPE_ERROR,
      payload: {
        error: error.message
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
  const detection = detectPlatform();

  if (detection) {
    console.log(`[ATlast] Detected ${detection.config.displayName} ${detection.pageType} page`);

    // Notify background that we're on a supported page
    sendToBackground({
      type: MessageType.STATE_UPDATE,
      payload: {
        status: 'ready',
        platform: detection.config.platform,
        pageType: detection.pageType
      }
    });
  }
})();
