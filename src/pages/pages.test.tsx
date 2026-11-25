import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { AdminUser } from '@/lib/types';
import { renderWithProviders } from '@/test/render';
import LandingPage from './LandingPage';
import VendorApprovals from './admin/VendorApprovals';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('pages', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('landing page has no fake testimonials or partnerships and switches language', async () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Farming tools and services in one place');
    expect(screen.queryByText(/Trusted by Farmers/i)).toBeNull();
    expect(screen.queryByText(/Partnered with/i)).toBeNull();

    await act(async () => {
      await i18n.changeLanguage('mr');
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('शेतीची साधने आणि सेवा, एकाच ठिकाणी');
    expect(document.documentElement.lang).toBe('mr');
  });

  it('approvals page lists pending accounts from the API', async () => {
    tokenStore.set('admin-token');
    const admin = { id: 1, name: 'Admin', role: 'admin', status: 'approved', preferred_language: 'en' };
    const pending: Partial<AdminUser> = {
      id: 7,
      name: 'Pending Agro',
      phone: '9000000023',
      email: null,
      role: 'vendor',
      status: 'pending',
      organization: 'Pending Agro Traders',
      qualifications: null,
      district: 'Ahilyanagar',
      state: 'Maharashtra',
      village: null,
      created_at: '2026-11-24T10:00:00Z',
    };
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/me')
          ? json(200, admin)
          : json(200, { items: [pending], total: 1, limit: 200, offset: 0 })
      )
    );
    renderWithProviders(<VendorApprovals />, { route: '/admin-vendor-approvals' });
    await waitFor(() => expect(screen.getByText('Pending Agro')).toBeInTheDocument());
    expect(screen.getByText('Pending Agro Traders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/api/admin/users?status=pending'))).toBe(true);
  });
});
