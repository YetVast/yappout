// src/app/api/auth/logout/route.ts
// Secure host-bound session termination and cookie clearance

import { NextResponse } from 'next/server';
import { toPublicAuthError } from '@yetvast/auth';
import { createClearSessionCookieHeader, validateMutationOrigin } from '@/auth/sessionService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    validateMutationOrigin(request);

    const response = NextResponse.json({ ok: true, status: 'ANONYMOUS' });
    response.headers.append('Set-Cookie', createClearSessionCookieHeader());
    return response;
  } catch (error) {
    const publicError = toPublicAuthError(error);
    return NextResponse.json(
      { ok: false, error: publicError.message },
      { status: 403 }
    );
  }
}
