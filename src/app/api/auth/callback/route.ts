// src/app/api/auth/callback/route.ts
// Handles OAuth callback, state verification, code exchange, and session establishment

import { NextResponse } from 'next/server';
import { isSafeRedirectUri } from '@yetvast/auth';
import { parseCookieHeader } from '@yetvast/auth/server';
import { handleCallback, toPublicAuthError } from '@/auth/authService';
import { getYappoutAuthConfig, YAPPOUT_TX_COOKIE } from '@/auth/config';
import { createClearTxCookieHeader } from '@/auth/sessionService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let appOrigin = 'http://localhost:3000';
  try {
    appOrigin = getYappoutAuthConfig().appOrigin;
  } catch {
    try {
      appOrigin = new URL(request.url).origin;
    } catch {
      // fallback
    }
  }

  const url = new URL(request.url);
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    url.host;
  if (host.includes('yetvast.com')) {
    appOrigin = 'https://yappout.yetvast.com';
  }

  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    const cookies = parseCookieHeader(request.headers.get('cookie'));
    const rawTxCookie = cookies[YAPPOUT_TX_COOKIE];

    const result = await handleCallback({
      code,
      state,
      rawTxCookie,
      error: errorParam,
      errorDesc,
      appOrigin,
    });

    const destination =
      result.returnTo && isSafeRedirectUri(result.returnTo, { fallbackOrigin: appOrigin })
        ? new URL(result.returnTo, appOrigin).toString()
        : `${appOrigin}/`;

    const response = NextResponse.redirect(destination, { status: 302 });
    response.headers.append('Set-Cookie', result.clearTxCookieHeader);
    response.headers.append('Set-Cookie', result.sessionCookieHeader);
    return response;
  } catch (err) {
    const publicError = toPublicAuthError(err);
    const errorUrl = new URL('/', appOrigin);
    errorUrl.searchParams.set('auth_error', publicError.message);
    errorUrl.searchParams.set('auth_error_code', publicError.code);

    const response = NextResponse.redirect(errorUrl.toString(), { status: 302 });
    try {
      response.headers.append('Set-Cookie', createClearTxCookieHeader());
    } catch {
      // ignore
    }
    return response;
  }
}
