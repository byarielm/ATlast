import browser from 'webextension-polyfill';
import {
  MessageType,
  onMessage,
  type Message,
  type ExtensionState,
  type ScrapeStartMessage,
  type ScrapeProgressMessage,
  type ScrapeCompleteMessage,
  type ScrapeErrorMessage
} from '../lib/messaging.js';
import { getState, setState } from '../lib/storage.js';

/**
 * Handle messages from content script and popup
 */
onMessage(async (message: Message, sender) => {
  console.log('[Background] Received message:', message.type);

  switch (message.type) {
    case MessageType.GET_STATE:
      return await handleGetState();

    case MessageType.STATE_UPDATE:
      return await handleStateUpdate(message.payload);

    case MessageType.SCRAPE_START:
      return await handleScrapeStart(message as ScrapeStartMessage);

    case MessageType.SCRAPE_PROGRESS:
      return await handleScrapeProgress(message as ScrapeProgressMessage);

    case MessageType.SCRAPE_COMPLETE:
      return await handleScrapeComplete(message as ScrapeCompleteMessage);

    case MessageType.SCRAPE_ERROR:
      return await handleScrapeError(message as ScrapeErrorMessage);

    default:
      console.warn('[Background] Unknown message type:', message.type);
  }
});

/**
 * Get current state
 */
async function handleGetState(): Promise<ExtensionState> {
  const state = await getState();
  console.log('[Background] Current state:', state);
  return state;
}

/**
 * Update state from content script
 */
async function handleStateUpdate(newState: Partial<ExtensionState>): Promise<void> {
  console.log('[Background] 📥 Received state update:', newState);
  const currentState = await getState();
  console.log('[Background] 📋 Current state before update:', currentState);
  const updatedState = { ...currentState, ...newState };
  await setState(updatedState);
  console.log('[Background] ✅ State updated successfully:', updatedState);

  // Verify the state was saved
  const verifyState = await getState();
  console.log('[Background] 🔍 Verified state from storage:', verifyState);
}

/**
 * Handle scrape start
 */
async function handleScrapeStart(message: ScrapeStartMessage): Promise<void> {
  const { platform, pageType, url } = message.payload;

  const state: ExtensionState = {
    status: 'scraping',
    platform,
    pageType,
    progress: {
      count: 0,
      status: 'scraping',
      message: 'Starting scan...'
    }
  };

  await setState(state);
  console.log('[Background] Scraping started:', { platform, pageType, url });
}

/**
 * Handle scrape progress
 */
async function handleScrapeProgress(message: ScrapeProgressMessage): Promise<void> {
  const progress = message.payload;
  const currentState = await getState();

  const state: ExtensionState = {
    ...currentState,
    status: 'scraping',
    progress
  };

  await setState(state);
  console.log('[Background] Progress:', progress);
}

/**
 * Handle scrape complete
 */
async function handleScrapeComplete(message: ScrapeCompleteMessage): Promise<void> {
  const result = message.payload;
  const currentState = await getState();

  const state: ExtensionState = {
    ...currentState,
    status: 'complete',
    result,
    progress: {
      count: result.totalCount,
      status: 'complete',
      message: `Scan complete! Found ${result.totalCount} users.`
    }
  };

  await setState(state);
  console.log('[Background] Scraping complete:', result.totalCount, 'users');
}

/**
 * Handle scrape error
 */
async function handleScrapeError(message: ScrapeErrorMessage): Promise<void> {
  const { error, category, userMessage, troubleshootingTips } = message.payload;
  const currentState = await getState();

  const state: ExtensionState = {
    ...currentState,
    status: 'error',
    error,
    errorCategory: category,
    errorUserMessage: userMessage,
    errorTroubleshootingTips: troubleshootingTips,
    progress: {
      count: currentState.progress?.count || 0,
      status: 'error',
      message: `Error: ${userMessage || error}`
    }
  };

  await setState(state);
  console.error('[Background] Scraping error:', {
    technical: error,
    category,
    userMessage,
    tips: troubleshootingTips
  });
}

/**
 * Log extension installation
 */
browser.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    console.log('[Background] First time installation - welcome!');
  }
});

console.log('[Background] Service worker loaded');
