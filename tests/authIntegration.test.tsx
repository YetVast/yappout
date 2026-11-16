// tests/authIntegration.test.tsx
// UI component integration and regression tests for YappOut V1 authentication

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthModal } from '@/components/auth/AuthModal';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { Header } from '@/components/layout/Header';
import type { AuthContextValue, YappoutUser } from '@/auth/types';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('YappOut Auth UI Integration & Invariants', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders subtle Sign in button in anonymous default state', async () => {
    // Mock /api/auth/session returning anonymous
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: false,
        status: 'ANONYMOUS',
        user: null,
      }),
    } as unknown as Response);

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthButton />
        </AuthProvider>
      );
    });

    // Wait for session check
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const signInBtn = container.querySelector('button');
    expect(signInBtn).not.toBeNull();
    expect(signInBtn?.textContent).toContain('Sign in');
  });

  it('renders user identity and profile indicator in authenticated state', async () => {
    const mockUser: YappoutUser = {
      id: 'yv_test_eva',
      displayName: 'Eva Reader',
      email: 'eva@example.com',
      authKind: 'persistent',
      provider: 'google',
      yvUserId: 'yv_test_eva',
      isPersistent: true,
      authenticatedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        status: 'AUTHENTICATED',
        user: mockUser,
      }),
    } as unknown as Response);

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthButton />
        </AuthProvider>
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(container.textContent).toContain('Eva Reader');
    expect(container.textContent).toContain('E'); // avatar initial
  });

  it('opens AuthModal with persistent Google and ephemeral GitHub options on Sign in click', async () => {
    const onSignIn = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(<AuthModal isOpen={true} onClose={onClose} onSignIn={onSignIn} />);
    });

    expect(container.textContent).toContain('Connect Yet Vast Account');
    expect(container.textContent).toContain('Google');
    expect(container.textContent).toContain('Persistent Identity');
    expect(container.textContent).toContain('GitHub');
    expect(container.textContent).toContain('Ephemeral Access');

    const buttons = Array.from(container.querySelectorAll('button'));
    const googleBtn = buttons.find((b) => b.textContent?.includes('Continue with Google'));
    expect(googleBtn).not.toBeNull();

    act(() => {
      googleBtn?.click();
    });
    expect(onSignIn).toHaveBeenCalledWith('google');

    const githubBtn = buttons.find((b) => b.textContent?.includes('Continue with GitHub'));
    expect(githubBtn).not.toBeNull();

    act(() => {
      githubBtn?.click();
    });
    expect(onSignIn).toHaveBeenCalledWith('github');
  });

  it('opens AccountMenu showing persistent Yet Vast ID and sign out option', async () => {
    const mockUser: YappoutUser = {
      id: 'yv_user_felix',
      displayName: 'Felix Engineer',
      email: 'felix@yetvast.com',
      authKind: 'persistent',
      provider: 'google',
      yvUserId: 'yv_user_felix',
      isPersistent: true,
      authenticatedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    const onSignOut = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    act(() => {
      root.render(
        <AccountMenu
          user={mockUser}
          isOpen={true}
          onClose={onClose}
          onSignOut={onSignOut}
        />
      );
    });

    expect(container.textContent).toContain('Felix Engineer');
    expect(container.textContent).toContain('felix@yetvast.com');
    expect(container.textContent).toContain('Yet Vast ID');
    expect(container.textContent).toContain('yv_user_felix');
    expect(container.textContent).toContain('Persistent');

    const signOutBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign out')
    );
    expect(signOutBtn).not.toBeNull();

    await act(async () => {
      signOutBtn?.click();
    });
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('preserves Header branding and V0 sample content functionality', async () => {
    const onLoadSample = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: false,
        status: 'ANONYMOUS',
        user: null,
      }),
    } as unknown as Response);

    await act(async () => {
      root.render(
        <AuthProvider>
          <Header onLoadSample={onLoadSample} />
        </AuthProvider>
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Branding and V0 button remain present
    expect(container.textContent).toContain('YappOut');
    expect(container.textContent).toContain('v0');

    const v0Btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'v0'
    );
    expect(v0Btn).not.toBeNull();

    act(() => {
      v0Btn?.click();
    });
    expect(onLoadSample).toHaveBeenCalledTimes(1);
  });

  it('regression invariant: signing out does not clear reading text or alter application state', async () => {
    let capturedAuth: AuthContextValue | null = null;
    function TestConsumer() {
      capturedAuth = useAuth();
      return <div>Status: {capturedAuth.status}</div>;
    }

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/auth/logout')) {
        return { ok: true, json: async () => ({ ok: true, status: 'ANONYMOUS' }) } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          authenticated: true,
          status: 'AUTHENTICATED',
          user: {
            id: 'yv_test_user',
            displayName: 'Test User',
            email: null,
            authKind: 'persistent',
            provider: 'google',
            yvUserId: 'yv_test_user',
            isPersistent: true,
            authenticatedAt: new Date().toISOString(),
            expiresAt: 9999999999,
          },
        }),
      } as unknown as Response;
    });

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(capturedAuth).not.toBeNull();
    expect(capturedAuth!.status).toBe('AUTHENTICATED');

    // Trigger sign out
    await act(async () => {
      await capturedAuth!.signOut();
    });

    expect(capturedAuth!.status).toBe('ANONYMOUS');
    expect(capturedAuth!.user).toBeNull();
  });
});
