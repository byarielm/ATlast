import type { ExtensionImportRequest } from '@atlast/shared';
import crypto from 'crypto';

/**
 * Shared in-memory store for extension imports
 * This is shared between extension-import.ts and get-extension-import.ts
 *
 * NOTE: In-memory storage works for development but will NOT work reliably
 * in production serverless environments where functions are stateless and
 * can run on different instances.
 *
 * For production, replace this with:
 * - Database (PostgreSQL/Neon)
 * - Redis/Upstash
 * - Netlify Blobs
 */
const importStore = new Map<string, ExtensionImportRequest>();

/**
 * Generate a random import ID
 */
export function generateImportId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Store import data and return import ID
 */
export function storeImport(data: ExtensionImportRequest): string {
  const importId = generateImportId();
  importStore.set(importId, data);

  console.log(`[ImportStore] Stored import ${importId} with ${data.usernames.length} usernames`);

  // Auto-expire after 1 hour
  setTimeout(() => {
    importStore.delete(importId);
    console.log(`[ImportStore] Expired import ${importId}`);
  }, 60 * 60 * 1000);

  return importId;
}

/**
 * Get import data by ID
 */
export function getImport(importId: string): ExtensionImportRequest | null {
  const data = importStore.get(importId) || null;
  console.log(`[ImportStore] Get import ${importId}: ${data ? 'found' : 'not found'}`);
  return data;
}

/**
 * Delete import data by ID
 */
export function deleteImport(importId: string): boolean {
  const result = importStore.delete(importId);
  console.log(`[ImportStore] Delete import ${importId}: ${result ? 'success' : 'not found'}`);
  return result;
}

/**
 * Get store stats (for debugging)
 */
export function getStoreStats(): { count: number; ids: string[] } {
  return {
    count: importStore.size,
    ids: Array.from(importStore.keys())
  };
}
