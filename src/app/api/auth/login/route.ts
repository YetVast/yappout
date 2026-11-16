// src/app/api/auth/login/route.ts
// Initiates OAuth 2.0 PKCE authorization code flow with Yet Vast Auth

import { NextResponse } from 'next/server';
import { initiateLogin } from '@/auth/authService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider') ?? undefined;

    const { authorizeUrl, txCookieHeader } = initiateLogin(provider);

    const response = NextResponse.redirect(authorizeUrl, { status: 302 });
    response.headers.append('Set-Cookie', txCookieHeader);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login initiation failed';
    const fallbackUrl = new URL('/', request.url);
    fallbackUrl.searchParams.set('auth_error', message);
    return NextResponse.redirect(fallbackUrl.toString(), { status: 302 });
  }
}
