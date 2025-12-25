import { BaseScraper } from './base-scraper.js';

/**
 * Twitter/X scraper implementation
 * Extracts usernames from Following/Followers pages
 */
export class TwitterScraper extends BaseScraper {
  /**
   * Returns the stable selector for Twitter username elements
   * data-testid="UserName" is used consistently across Twitter's UI
   */
  getUsernameSelector(): string {
    return '[data-testid="UserName"]';
  }

  /**
   * Extracts username from Twitter UserName element
   * Structure: <div data-testid="UserName">
   *   <div><span>Display Name</span></div>
   *   <div><span>@handle</span></div>
   * </div>
   */
  extractUsername(element: Element): string | null {
    // Find all spans within the UserName element
    const spans = element.querySelectorAll('span');

    for (const span of spans) {
      const text = span.textContent?.trim();

      // Look for text starting with @
      if (text && text.startsWith('@')) {
        // Remove @ prefix and convert to lowercase
        const username = text.slice(1).toLowerCase();

        // Validate username format (alphanumeric + underscore)
        if (/^[a-z0-9_]+$/i.test(username)) {
          return username;
        }
      }
    }

    return null;
  }
}
