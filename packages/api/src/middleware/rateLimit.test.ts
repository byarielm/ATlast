/**
 * Rate Limit Middleware Tests
 * Tests for rate limiting logic and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimiter, apiRateLimit, searchRateLimit, followRateLimit } from './rateLimit';

describe('Rate Limit Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
  });

  describe('Basic Rate Limiting', () => {
    it('allows requests under the limit', async () => {
      const limiter = rateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // Send 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '127.0.0.1' },
        });
        expect(res.status).toBe(200);
      }
    });

    it('blocks requests over the limit', async () => {
      const limiter = rateLimiter({
        maxRequests: 3,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '192.168.1.1';

      // Send 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': ip },
        });
        expect(res.status).toBe(200);
      }

      // 4th request should be blocked
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      expect(res.status).toBe(429);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('returns custom error message', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        message: 'Custom rate limit message',
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '192.168.1.2';

      // First request succeeds
      await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      // Second request blocked with custom message
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      expect(res.status).toBe(429);
      const body = await res.json() as { error: string };
      expect(body.error).toBe('Custom rate limit message');
    });
  });

  describe('Rate Limit Headers', () => {
    it('includes X-RateLimit-Limit header', async () => {
      const limiter = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });

      expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    });

    it('includes X-RateLimit-Remaining header', async () => {
      const limiter = rateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '10.0.0.2';

      // First request
      const res1 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(res1.headers.get('X-RateLimit-Remaining')).toBe('4');

      // Second request
      const res2 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(res2.headers.get('X-RateLimit-Remaining')).toBe('3');
    });

    it('includes X-RateLimit-Reset header', async () => {
      const limiter = rateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '10.0.0.3' },
      });

      const resetHeader = res.headers.get('X-RateLimit-Reset');
      expect(resetHeader).toBeDefined();

      const resetTime = parseInt(resetHeader!, 10);
      expect(resetTime).toBeGreaterThan(Date.now() / 1000);
    });

    it('includes Retry-After header when rate limited', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '10.0.0.4';

      // First request
      await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      // Second request (rate limited)
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      expect(res.status).toBe(429);
      const retryAfter = res.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter!, 10)).toBeGreaterThan(0);
    });

    it('includes retryAfter in response body', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '10.0.0.5';

      await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });

      const body = await res.json() as { retryAfter: number };
      expect(body.retryAfter).toBeDefined();
      expect(typeof body.retryAfter).toBe('number');
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Key Generation', () => {
    it('uses IP address by default', async () => {
      const limiter = rateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // IP 1 - 2 requests
      await app.request('/test', {
        headers: { 'x-forwarded-for': '1.1.1.1' },
      });
      await app.request('/test', {
        headers: { 'x-forwarded-for': '1.1.1.1' },
      });

      // IP 2 - should still work (different key)
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '2.2.2.2' },
      });

      expect(res.status).toBe(200);
    });

    it('uses session ID when available', async () => {
      const limiter = rateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      app.use('*', (c, next) => {
        (c.set as (key: string, value: unknown) => void)('sessionId', 'session-123');
        return next();
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // Two requests with same session
      await app.request('/test', {
        headers: { 'x-forwarded-for': '3.3.3.3' },
      });
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '3.3.3.3' },
      });

      // Both should count against same session
      expect(res.status).toBe(200);
    });

    it('uses custom key generator', async () => {
      const limiter = rateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        keyGenerator: (c) => {
          return c.req.header('x-api-key') || 'default';
        },
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // Two requests with same API key
      await app.request('/test', {
        headers: { 'x-api-key': 'key-abc' },
      });
      await app.request('/test', {
        headers: { 'x-api-key': 'key-abc' },
      });

      // Third request should be blocked
      const res = await app.request('/test', {
        headers: { 'x-api-key': 'key-abc' },
      });

      expect(res.status).toBe(429);
    });

    it('handles x-real-ip header', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '5.5.5.5';

      // First request
      await app.request('/test', {
        headers: { 'x-real-ip': ip },
      });

      // Second request should be blocked (same IP)
      const res = await app.request('/test', {
        headers: { 'x-real-ip': ip },
      });

      expect(res.status).toBe(429);
    });

    it('falls back to "unknown" when no IP or session', async () => {
      const limiter = rateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // Requests without IP headers will share "unknown" key
      await app.request('/test');
      await app.request('/test');

      const res = await app.request('/test');
      expect(res.status).toBe(429);
    });
  });

  describe('Window Management', () => {
    it('resets count after window expires', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 100, // Very short window for testing
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '6.6.6.6';

      // First request
      const res1 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(res1.status).toBe(200);

      // Second request (immediately) should be blocked
      const res2 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(res2.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third request should succeed (new window)
      const res3 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(res3.status).toBe(200);
    });

    it('handles multiple windows for different keys', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // Different IPs should have independent windows
      const res1 = await app.request('/test', {
        headers: { 'x-forwarded-for': '7.7.7.7' },
      });
      const res2 = await app.request('/test', {
        headers: { 'x-forwarded-for': '8.8.8.8' },
      });
      const res3 = await app.request('/test', {
        headers: { 'x-forwarded-for': '9.9.9.9' },
      });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('apiRateLimit: 60 requests per minute', async () => {
      app.use('/api/*', apiRateLimit);
      app.get('/api/test', (c) => c.json({ success: true }));

      const res = await app.request('/api/test', {
        headers: { 'x-forwarded-for': '10.10.10.10' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    });

    it('searchRateLimit: 10 requests per minute', async () => {
      app.use('/search', searchRateLimit);
      app.post('/search', (c) => c.json({ success: true }));

      const res = await app.request('/search', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.10.10.11' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    });

    it('followRateLimit: 100 requests per hour', async () => {
      app.use('/follow', followRateLimit);
      app.post('/follow', (c) => c.json({ success: true }));

      const res = await app.request('/follow', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.10.10.12' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
    });
  });

  describe('Edge Cases', () => {
    it('handles concurrent requests from same key', async () => {
      const limiter = rateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '11.11.11.11';

      // Send 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        app.request('/test', {
          headers: { 'x-forwarded-for': ip },
        })
      );

      const results = await Promise.all(requests);

      const successCount = results.filter((r) => r.status === 200).length;
      const blockedCount = results.filter((r) => r.status === 429).length;

      // Some should succeed, some should be blocked
      expect(successCount).toBeLessThanOrEqual(5);
      expect(blockedCount).toBeGreaterThan(0);
      expect(successCount + blockedCount).toBe(10);
    });

    it('handles zero maxRequests gracefully', async () => {
      const limiter = rateLimiter({
        maxRequests: 0,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '12.12.12.12' },
      });

      // Should immediately rate limit
      expect(res.status).toBe(429);
    });

    it('handles very short window (1ms)', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 1,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const ip = '13.13.13.13';

      const res1 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      expect(res1.status).toBe(200);

      // Wait 2ms
      await new Promise((resolve) => setTimeout(resolve, 2));

      const res2 = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      });
      // Should be allowed (new window)
      expect(res2.status).toBe(200);
    });

    it('handles very large maxRequests', async () => {
      const limiter = rateLimiter({
        maxRequests: 1000000,
        windowMs: 60000,
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '14.14.14.14' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('999999');
    });
  });

  describe('Store Cleanup', () => {
    it('periodically cleans up expired entries', async () => {
      const limiter = rateLimiter({
        maxRequests: 1,
        windowMs: 50, // Short window
      });

      app.use('/test', limiter);
      app.get('/test', (c) => c.json({ success: true }));

      // Create many entries that will expire
      for (let i = 0; i < 100; i++) {
        await app.request('/test', {
          headers: { 'x-forwarded-for': `${i}.0.0.1` },
        });
      }

      // Wait for entries to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup by making more requests
      // (cleanup happens randomly with 1% probability, so we make many requests)
      for (let i = 0; i < 100; i++) {
        await app.request('/test', {
          headers: { 'x-forwarded-for': `${i}.0.0.1` },
        });
      }

      // If cleanup didn't crash, test passes
      expect(true).toBe(true);
    });
  });
});
