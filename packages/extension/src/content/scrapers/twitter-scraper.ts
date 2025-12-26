import { BaseScraper } from './base-scraper.js';

/**
 * Twitter/X scraper implementation
 * Extracts usernames from Following/Followers pages
 */
export class TwitterScraper extends BaseScraper {
  /**
   * Returns the stable selector for Twitter user cells
   * data-testid="UserCell" contains each user row
   */
  getUsernameSelector(): string {
    return '[data-testid="UserCell"]';
  }

  /**
   * Extracts username from Twitter UserCell element
   * Each UserCell contains profile links with href="/username"
   */
  extractUsername(element: Element): string | null {
    // Find all links in the cell
    const links = element.querySelectorAll('a');

    for (const link of links) {
      const href = link.getAttribute('href');

      // Profile links are like /username (not /i/something or /username/status/...)
      if (href && href.startsWith('/') && !href.startsWith('/i/')) {
        const parts = href.split('/');

        // Should be exactly 2 parts: ['', 'username']
        if (parts.length === 2 && parts[1]) {
          const username = parts[1].toLowerCase();

          // Validate username format (alphanumeric + underscore)
          if (/^[a-z0-9_]+$/i.test(username)) {
            return username;
          }
        }
      }
    }

    return null;
  }
}
