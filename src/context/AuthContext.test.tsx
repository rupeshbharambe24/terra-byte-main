import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/i18n';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenStore } from '@/lib/api';
import type { User } from '@/lib/types';

const farmer: User = {
  id: 1,
  name: 'Asha',
  phone: '9876543210',
  email: null,
  role: 'farmer',
  status: 'approved',
  preferred_language: 'en',
  organization: null,
  qualifications: null,
  state: 'Maharashtra',
  district: 'Pune',
  village: null,
  lat: null,
  lon: null,
  created_at: '2026-11-24T00:00:00Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let auth: ReturnType<typeof useAuth> | null = null;
const Probe: React.FC = () => {
  auth = useAuth();
  return <div>{auth.isLoading ? 'loading' : auth.user ? `user:${auth.user.name}` : 'anonymous'}</div>;
};

function renderAuth() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthContext', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts anonymous without a stored token', () => {
    renderAuth();
    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores the session from a stored token via /api/me', async () => {
    tokenStore.set('stored');
    fetchMock.mockResolvedValue(json(200, farmer));
    renderAuth();
    await waitFor(() => expect(screen.getByText('user:Asha')).toBeInTheDocument());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/me');
  });

  it('drops an invalid stored token', async () => {
    tokenStore.set('bad');
    fetchMock.mockResolvedValue(json(401, { detail: 'x', code: 'invalid_token' }));
    renderAuth();
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
    expect(tokenStore.get()).toBeNull();
  });

  it('logs in, stores the token and logs out', async () => {
    fetchMock.mockResolvedValue(json(200, { access_token: 'new-token', token_type: 'bearer', expires_in: 60, user: farmer }));
    renderAuth();
    await act(async () => {
      await auth!.login('9876543210', 'secret-pass');
    });
    expect(screen.getByText('user:Asha')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('new-token');
    act(() => auth!.logout());
    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('surfaces the pending-approval error code from login', async () => {
    fetchMock.mockResolvedValue(json(403, { detail: 'pending', code: 'account_pending' }));
    renderAuth();
    await expect(auth!.login('9822000001', 'secret-pass')).rejects.toMatchObject({ code: 'account_pending' });
    expect(tokenStore.get()).toBeNull();
  });
});
