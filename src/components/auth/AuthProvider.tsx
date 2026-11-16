'use client';
// src/components/auth/AuthProvider.tsx
// Central React context managing authentication state and actions for YappOut

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthContextValue, AuthStatus, SessionApiResponse, YappoutUser } from '@/auth/types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('auth_error');
    }
    return null;
  });

  const [status, setStatus] = useState<AuthStatus>(() => {
    if (typeof window !== 'undefined') {
      const hasError = Boolean(new URLSearchParams(window.location.search).get('auth_error'));
      if (hasError) return 'AUTH_ERROR';
    }
    return 'ANONYMOUS';
  });

  const [user, setUser] = useState<YappoutUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        setStatus('ANONYMOUS');
        setUser(null);
        return;
      }
      const data = (await res.json()) as SessionApiResponse;
      if (data.authenticated && data.user) {
        setStatus('AUTHENTICATED');
        setUser(data.user);
        setError(null);
      } else if (data.status === 'SESSION_EXPIRED') {
        setStatus('SESSION_EXPIRED');
        setUser(null);
      } else {
        setStatus('ANONYMOUS');
        setUser(null);
      }
    } catch {
      setStatus('ANONYMOUS');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clean up auth_error URL query parameter without triggering page reload
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('auth_error')) {
        params.delete('auth_error');
        const cleanQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSession();
  }, [fetchSession]);

  const signIn = useCallback((provider?: string) => {
    setStatus('AUTHENTICATING');
    const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/login${query}`);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
    } catch {
      // ignore network errors on signout
    } finally {
      setUser(null);
      setStatus('ANONYMOUS');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (status === 'AUTH_ERROR') {
      setStatus('ANONYMOUS');
    }
  }, [status]);

  const value: AuthContextValue = {
    status,
    user,
    error,
    isLoading,
    signIn,
    signOut,
    clearError,
    refreshSession: fetchSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    // Safe fallback if used outside AuthProvider (e.g. standalone test)
    return {
      status: 'ANONYMOUS',
      user: null,
      error: null,
      isLoading: false,
      signIn: () => {},
      signOut: async () => {},
      clearError: () => {},
      refreshSession: async () => {},
    };
  }
  return context;
}
