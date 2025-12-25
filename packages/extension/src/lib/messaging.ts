import type { ScraperProgress, ScraperResult } from '../content/scrapers/base-scraper.js';

/**
 * Message types for extension communication
 */
export enum MessageType {
  // Content -> Background
  SCRAPE_START = 'SCRAPE_START',
  SCRAPE_PROGRESS = 'SCRAPE_PROGRESS',
  SCRAPE_COMPLETE = 'SCRAPE_COMPLETE',
  SCRAPE_ERROR = 'SCRAPE_ERROR',

  // Popup -> Background
  GET_STATE = 'GET_STATE',
  START_SCRAPE = 'START_SCRAPE',
  UPLOAD_TO_ATLAST = 'UPLOAD_TO_ATLAST',

  // Background -> Popup
  STATE_UPDATE = 'STATE_UPDATE',
  UPLOAD_SUCCESS = 'UPLOAD_SUCCESS',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
}

export interface Message {
  type: MessageType;
  payload?: any;
}

export interface ScrapeStartMessage extends Message {
  type: MessageType.SCRAPE_START;
  payload: {
    platform: string;
    pageType: string;
    url: string;
  };
}

export interface ScrapeProgressMessage extends Message {
  type: MessageType.SCRAPE_PROGRESS;
  payload: ScraperProgress;
}

export interface ScrapeCompleteMessage extends Message {
  type: MessageType.SCRAPE_COMPLETE;
  payload: ScraperResult;
}

export interface ScrapeErrorMessage extends Message {
  type: MessageType.SCRAPE_ERROR;
  payload: {
    error: string;
  };
}

export interface StateUpdateMessage extends Message {
  type: MessageType.STATE_UPDATE;
  payload: ExtensionState;
}

export interface UploadSuccessMessage extends Message {
  type: MessageType.UPLOAD_SUCCESS;
  payload: {
    redirectUrl: string;
  };
}

export interface UploadErrorMessage extends Message {
  type: MessageType.UPLOAD_ERROR;
  payload: {
    error: string;
  };
}

/**
 * Extension state
 */
export interface ExtensionState {
  status: 'idle' | 'ready' | 'scraping' | 'complete' | 'error' | 'uploading';
  platform?: string;
  pageType?: string;
  progress?: ScraperProgress;
  result?: ScraperResult;
  error?: string;
}

/**
 * Send message to background script
 */
export function sendToBackground<T = any>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

/**
 * Send message to active tab's content script
 */
export async function sendToContent(message: Message): Promise<any> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) {
    throw new Error('No active tab found');
  }
  return chrome.tabs.sendMessage(tab.id, message);
}

/**
 * Listen for messages
 */
export function onMessage(
  handler: (message: Message, sender: chrome.runtime.MessageSender) => void | Promise<void>
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message, sender);

    // Handle async handlers
    if (result instanceof Promise) {
      result.then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
    }

    sendResponse({ success: true });
  });
}
