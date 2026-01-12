export interface ScraperProgress {
  count: number;
  status: 'scraping' | 'complete' | 'error';
  message?: string;
}

export interface ScraperResult {
  usernames: string[];
  totalCount: number;
  scrapedAt: string;
}

export interface ScraperCallbacks {
  onProgress?: (progress: ScraperProgress) => void;
  onComplete?: (result: ScraperResult) => void;
  onError?: (error: Error, context?: ScraperErrorContext) => void;
}

export interface ScraperErrorContext {
  usersFound: number;
  scrollAttempts: number;
  timeElapsed: number;
  pageUrl: string;
}

export abstract class BaseScraper {
  protected onProgress: (progress: ScraperProgress) => void;
  protected onComplete: (result: ScraperResult) => void;
  protected onError: (error: Error, context?: ScraperErrorContext) => void;

  constructor(callbacks: ScraperCallbacks = {}) {
    this.onProgress = callbacks.onProgress || (() => {});
    this.onComplete = callbacks.onComplete || (() => {});
    this.onError = callbacks.onError || (() => {});
  }

  /**
   * Returns the CSS selector to find username elements
   * Must be implemented by subclasses
   */
  abstract getUsernameSelector(): string;

  /**
   * Extracts username from a DOM element
   * Must be implemented by subclasses
   * @returns username without @ prefix, or null if invalid
   */
  abstract extractUsername(element: Element): string | null;

  /**
   * Shared infinite scroll logic
   * Scrolls page until no new users found for 3 consecutive scrolls
   */
  async scrape(): Promise<string[]> {
    const startTime = Date.now();
    let scrollAttempts = 0;

    try {
      const usernames = new Set<string>();
      let stableCount = 0;
      const maxStableCount = 3;
      let lastCount = 0;

      this.onProgress({ count: 0, status: 'scraping', message: 'Starting scan...' });

      while (stableCount < maxStableCount) {
        scrollAttempts++;

        // Collect visible usernames
        const elements = document.querySelectorAll(this.getUsernameSelector());

        elements.forEach(el => {
          const username = this.extractUsername(el);
          if (username) {
            usernames.add(username);
          }
        });

        // Report progress
        this.onProgress({
          count: usernames.size,
          status: 'scraping',
          message: `Found ${usernames.size} users...`
        });

        // Scroll down
        window.scrollBy({ top: 1000, behavior: 'smooth' });
        await this.sleep(500);

        // Check if we found new users
        if (usernames.size === lastCount) {
          stableCount++;
        } else {
          stableCount = 0;
          lastCount = usernames.size;
        }
      }

      const result: ScraperResult = {
        usernames: Array.from(usernames),
        totalCount: usernames.size,
        scrapedAt: new Date().toISOString()
      };

      this.onProgress({
        count: result.totalCount,
        status: 'complete',
        message: `Scan complete! Found ${result.totalCount} users.`
      });

      this.onComplete(result);
      return result.usernames;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const timeElapsed = Date.now() - startTime;

      // Build error context for categorization
      const context: ScraperErrorContext = {
        usersFound: 0, // Will be set by content script if it has the info
        scrollAttempts,
        timeElapsed,
        pageUrl: window.location.href
      };

      this.onError(err, context);
      this.onProgress({
        count: 0,
        status: 'error',
        message: `Error: ${err.message}`
      });
      throw err;
    }
  }

  /**
   * Utility: sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
