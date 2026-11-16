// src/app/api/auth/session/route.ts
// Session query route returning verified YappOut user identity and auth status

import { NextResponse } from 'next/server';
import { parseCookieHeader } from '@yetvast/auth/server';
import { YAPPOUT_SESSION_COOKIE } from '@/auth/config';
import { createClearSessionCookieHeader, readVerifiedSession } from '@/auth/sessionService';
import { assertionToYappoutUser } from '@/auth/identityService';
import type { SessionApiResponse } from '@/auth/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const rawToken = cookies[YAPPOUT_SESSION_COOKIE];

  if (!rawToken) {
    const payload: SessionApiResponse = {
      authenticated: false,
      status: 'ANONYMOUS',
      user: null,
    };
    return NextResponse.json(payload);
  }

  const assertion = await readVerifiedSession(rawToken);

  if (!assertion) {
    const payload: SessionApiResponse = {
      authenticated: false,
      status: 'SESSION_EXPIRED',
      user: null,
    };
    const response = NextResponse.json(payload);
    try {
      response.headers.append('Set-Cookie', createClearSessionCookieHeader());
    } catch {
      // ignore
    }
    return response;
  }

  const user = assertionToYappoutUser(assertion);
  const payload: SessionApiResponse = {
    authenticated: true,
    status: 'AUTHENTICATED',
    user,
  };
  return NextResponse.json(payload);
}
