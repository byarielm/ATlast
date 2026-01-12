/**
 * Error categories for better user feedback
 */
export enum ErrorCategory {
  DOM_ERROR = 'DOM_ERROR',
  SCRAPING_ERROR = 'SCRAPING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  PAGE_STATE_ERROR = 'PAGE_STATE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Enhanced error with category and user-friendly message
 */
export interface CategorizedError {
  category: ErrorCategory;
  technicalMessage: string;
  userMessage: string;
  troubleshootingTips?: string[];
}

/**
 * Categorize an error and provide user-friendly messaging
 */
export function categorizeError(error: Error, context?: ErrorContext): CategorizedError {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // DOM/Selector errors
  if (
    message.includes('cannot read') ||
    message.includes('null') ||
    message.includes('undefined') ||
    message.includes('queryselector') ||
    message.includes('element')
  ) {
    return {
      category: ErrorCategory.DOM_ERROR,
      technicalMessage: error.message,
      userMessage: 'Page structure has changed',
      troubleshootingTips: [
        'Try refreshing the page',
        'Make sure you\'re on the Following page',
        'Extension may need an update'
      ]
    };
  }

  // Network/fetch errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    name.includes('network')
  ) {
    return {
      category: ErrorCategory.NETWORK_ERROR,
      technicalMessage: error.message,
      userMessage: 'Network connection issue',
      troubleshootingTips: [
        'Check your internet connection',
        'Try again in a moment',
        'Page may be loading slowly'
      ]
    };
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('blocked') ||
    message.includes('cors')
  ) {
    return {
      category: ErrorCategory.PERMISSION_ERROR,
      technicalMessage: error.message,
      userMessage: 'Extension permissions issue',
      troubleshootingTips: [
        'Reload the extension',
        'Refresh the page',
        'Check browser permissions'
      ]
    };
  }

  // Use context to provide better categorization
  if (context) {
    // No users found - likely not logged in or on wrong page
    if (context.usersFound === 0 && context.scrollAttempts && context.scrollAttempts > 2) {
      return {
        category: ErrorCategory.PAGE_STATE_ERROR,
        technicalMessage: error.message,
        userMessage: 'No users found on page',
        troubleshootingTips: [
          'Make sure you\'re logged in to X/Twitter',
          'Verify you\'re on the Following page',
          'Check if you actually follow anyone'
        ]
      };
    }

    // Scraping took too long or got stuck
    if (context.timeElapsed && context.timeElapsed > 120000) {
      return {
        category: ErrorCategory.SCRAPING_ERROR,
        technicalMessage: error.message,
        userMessage: 'Scanning took too long',
        troubleshootingTips: [
          'Page may have too many users',
          'Try scrolling manually first',
          'Refresh and try again'
        ]
      };
    }
  }

  // Generic scraping error
  if (
    message.includes('scrape') ||
    message.includes('scan') ||
    message.includes('extract')
  ) {
    return {
      category: ErrorCategory.SCRAPING_ERROR,
      technicalMessage: error.message,
      userMessage: 'Failed to scan page',
      troubleshootingTips: [
        'Refresh the page and try again',
        'Make sure page is fully loaded',
        'Check if you\'re logged in'
      ]
    };
  }

  // Unknown error
  return {
    category: ErrorCategory.UNKNOWN_ERROR,
    technicalMessage: error.message,
    userMessage: 'An unexpected error occurred',
    troubleshootingTips: [
      'Refresh the page and try again',
      'Reload the extension',
      'Report this issue if it persists'
    ]
  };
}

/**
 * Context information to help categorize errors
 */
export interface ErrorContext {
  usersFound?: number;
  scrollAttempts?: number;
  timeElapsed?: number;
  pageUrl?: string;
}

/**
 * Common scenario detection
 */
export function detectCommonScenarios(context: ErrorContext): CategorizedError | null {
  // Not logged in to X/Twitter
  if (context.usersFound === 0 && context.scrollAttempts && context.scrollAttempts >= 3) {
    return {
      category: ErrorCategory.PAGE_STATE_ERROR,
      technicalMessage: 'No users found after multiple scroll attempts',
      userMessage: 'No users found - are you logged in to X?',
      troubleshootingTips: [
        'Log in to your X/Twitter account',
        'Navigate to your Following page',
        'Make sure you follow at least one account'
      ]
    };
  }

  // On wrong page
  if (context.pageUrl && !context.pageUrl.includes('/following')) {
    return {
      category: ErrorCategory.PAGE_STATE_ERROR,
      technicalMessage: 'Not on Following page',
      userMessage: 'Wrong page - must be on Following page',
      troubleshootingTips: [
        'Click "Open X Following" button',
        'Or navigate to x.com/following manually'
      ]
    };
  }

  return null;
}
