// @vitest-environment node
// tests/authRoutes.test.ts
// Route handler integration tests for YappOut authentication API routes

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as loginHandler } from '@/app/api/auth/login/route';
import { GET as sessionHandler } from '@/app/api/auth/session/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as callbackHandler } from '@/app/api/auth/callback/route';

describe('YappOut Auth API Routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.YAPPOUT_ORIGIN = 'http://localhost:3000';
    process.env.YETVAST_AUTH_ORIGIN = 'http://localhost:3001';
    process.env.YAPPOUT_APP_ID = 'yappout';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('GET /api/auth/login', () => {
    it('redirects to Yet Vast Auth /authorize with S256 PKCE and sets transaction cookie', async () => {
      const request = new Request('http://localhost:3000/api/auth/login?provider=google');
      const response = await loginHandler(request);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);
      expect(redirectUrl.origin).toBe('http://localhost:3001');
      expect(redirectUrl.pathname).toBe('/authorize');
      expect(redirectUrl.searchParams.get('app_id')).toBe('yappout');
      expect(redirectUrl.searchParams.get('code_challenge_method')).toBe('S256');
      expect(redirectUrl.searchParams.get('provider')).toBe('google');

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('yv_yappout_tx=');
    });

    it('preserves safe returnTo in transaction cookie and omits invalid redirect target', async () => {
      const request = new Request('http://localhost:3000/api/auth/login?returnTo=%2Freading');
      const response = await loginHandler(request);

      expect(response.status).toBe(302);
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('yv_yappout_tx=');
      expect(decodeURIComponent(setCookie!)).toContain('"returnTo":"/reading"');
    });

    it('forces canonical yetvast.com redirect_uri when request host is on yetvast.com', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.YAPPOUT_ORIGIN = 'https://yappout.yetvast.com';
      process.env.YETVAST_AUTH_ORIGIN = 'https://auth.yetvast.com';

      const request = new Request('https://yappout.yetvast.com/api/auth/login', {
        headers: {
          host: 'yappout.yetvast.com',
        },
      });
      const response = await loginHandler(request);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe(
        'https://yappout.yetvast.com/api/auth/callback'
      );
    });
  });

  describe('GET /api/auth/session', () => {
    it('returns ANONYMOUS status when no session cookie is present', async () => {
      const request = new Request('http://localhost:3000/api/auth/session');
      const response = await sessionHandler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
      expect(data.status).toBe('ANONYMOUS');
      expect(data.user).toBeNull();
    });

    it('returns SESSION_EXPIRED and clears cookie when invalid or expired token is present', async () => {
      const request = new Request('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: 'yv_yappout_session=corrupt.or.invalid.token',
        },
      });
      const response = await sessionHandler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
      expect(data.status).toBe('SESSION_EXPIRED');
      expect(data.user).toBeNull();

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('yv_yappout_session=;');
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears session cookie on valid same-origin logout request', async () => {
      const request = new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
      });
      const response = await logoutHandler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe('ANONYMOUS');

      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('yv_yappout_session=;');
      expect(setCookie).toContain('Max-Age=0');
    });

    it('rejects cross-origin logout request with 403 status', async () => {
      const request = new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          origin: 'https://attacker.site',
        },
      });
      const response = await logoutHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Cross-origin request blocked');
    });
  });

  describe('GET /api/auth/callback', () => {
    it('redirects with auth_error when callback parameters are invalid or missing', async () => {
      const request = new Request('http://localhost:3000/api/auth/callback?error=access_denied&error_description=Cancelled');
      const response = await callbackHandler(request);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toContain('auth_error=Cancelled');
    });

    it('handles central auth registration error codes with clear user-friendly messages', async () => {
      const request = new Request('http://localhost:3000/api/auth/callback?error=application_not_registered');
      const response = await callbackHandler(request);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toContain('auth_error=');
      const decoded = decodeURIComponent(location!.replace(/\+/g, ' '));
      expect(decoded).toContain('YappOut is not registered');
      expect(location).toContain('auth_error_code=APPLICATION_NOT_REGISTERED');
    });
  });
});
