import browser from 'webextension-polyfill';
import type { ExtensionState } from './messaging.js';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  STATE: 'extensionState'
} as const;

/**
 * Get extension state from storage
 */
export async function getState(): Promise<ExtensionState> {
  const result = await browser.storage.local.get(STORAGE_KEYS.STATE);
  return result[STORAGE_KEYS.STATE] || { status: 'idle' };
}

/**
 * Save extension state to storage
 */
export async function setState(state: ExtensionState): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.STATE]: state });
}

/**
 * Clear extension state
 */
export async function clearState(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.STATE);
}
