/**
 * Extension API Contract Tests
 *
 * Validates that POST /api/extension/import responses
 * match the expected Zod schemas at runtime.
 */

import { describe, it, expect } from 'vitest';
import { authRequest, parseResponse, request } from '../helpers';
import {
  ExtensionImportSuccessSchema,
  ExtensionImportDataSchema,
} from '../../src/types/schemas';

describe('Extension API Contract', () => {
  const validImportBody = {
    platform: 'twitter',
    usernames: ['user1', 'user2', 'user3'],
    metadata: {
      extensionVersion: '1.0.0',
      scrapedAt: new Date().toISOString(),
      pageType: 'following',
      sourceUrl: 'https://twitter.com/testuser/following',
    },
  };

  // ========================================================================
  // POST /api/extension/import — success
  // ========================================================================

  it('success response matches ExtensionImportSuccessSchema', async () => {
    const res = await authRequest('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify(validImportBody),
    });

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    const result = ExtensionImportSuccessSchema.safeParse(body);

    if (!result.success) {
      console.error('Schema validation errors:', result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it('import data matches ExtensionImportDataSchema', async () => {
    const res = await authRequest('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify(validImportBody),
    });

    const body = await parseResponse<{
      data: Record<string, unknown>;
    }>(res);
    const result = ExtensionImportDataSchema.safeParse(body.data);

    if (!result.success) {
      console.error('Data validation errors:', result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it('usernameCount matches input array length', async () => {
    const res = await authRequest('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify(validImportBody),
    });

    const body = await parseResponse<{
      data: { usernameCount: number };
    }>(res);

    expect(body.data.usernameCount).toBe(validImportBody.usernames.length);
  });

  it('redirectUrl contains the importId', async () => {
    const res = await authRequest('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify(validImportBody),
    });

    const body = await parseResponse<{
      data: { importId: string; redirectUrl: string };
    }>(res);

    expect(body.data.redirectUrl).toContain(body.data.importId);
  });

  it('success response has no unexpected top-level keys', async () => {
    const res = await authRequest('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify(validImportBody),
    });

    const body = await parseResponse<Record<string, unknown>>(res);
    const expectedKeys = ['success', 'data'];
    const unexpectedKeys = Object.keys(body).filter(
      (k) => !expectedKeys.includes(k),
    );
    expect(unexpectedKeys).toEqual([]);
  });

  // ========================================================================
  // Error responses
  // ========================================================================

  it('unauthenticated request returns 401', async () => {
    const res = await request('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify(validImportBody),
    });
    expect(res.status).toBe(401);
  });

  it('invalid body returns validation error', async () => {
    const res = await authRequest('/api/extension/import', {
      method: 'POST',
      body: JSON.stringify({ platform: 'twitter', usernames: [] }),
    });

    // Zod min(1) rejects empty array
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
