import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { ConsultationDetail, Role } from '@/lib/types';
import { renderWithProviders } from '@/test/render';
import ConsultationThread from './shared/ConsultationThread';
import KVKConsultation from './features/KVKConsultation';
import KVKIntegration from './admin/KVKIntegration';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const user = (id: number, role: Role) => ({ id, name: `User ${id}`, role, status: 'approved', preferred_language: 'en' });

const consultation = (overrides: Partial<ConsultationDetail> = {}): ConsultationDetail => ({
  id: 5,
  farmer_id: 1,
  farmer_name: 'Ramesh',
  farmer_district: 'Pune',
  expert_id: null,
  expert_name: null,
  kvk_id: null,
  kvk_name: null,
  crop: 'Onion',
  category: 'nutrient',
  question: 'Leaf tips are turning yellow. What should I check?',
  image_path: null,
  status: 'open',
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
  assigned_at: null,
  first_response_at: null,
  closed_at: null,
  message_count: 0,
  messages: [],
  ...overrides,
});

describe('advice pages', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    tokenStore.set('token');
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  function renderThread(viewer: ReturnType<typeof user>, initial: ConsultationDetail) {
    let detail = initial; // the "server" state
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, viewer));
      if (url === '/api/consultations/5/claim' && init?.method === 'POST') {
        detail = { ...detail, expert_id: viewer.id, expert_name: viewer.name, status: 'assigned' };
        return Promise.resolve(json(200, detail));
      }
      if (url.startsWith('/api/consultations/5')) return Promise.resolve(json(200, detail));
      return Promise.resolve(json(404, { detail: 'nope', code: 'not_found' }));
    });
    renderWithProviders(
      <Routes>
        <Route path="/consultations/:consultationId" element={<ConsultationThread />} />
      </Routes>,
      { route: '/consultations/5' }
    );
  }

  it('shows the claim button to an expert on an unassigned question and claims it', async () => {
    renderThread(user(9, 'expert'), consultation());
    const claim = await screen.findByRole('button', { name: 'Take this question' });
    expect(screen.queryByLabelText('Your reply')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reassign' })).toBeNull();
    fireEvent.click(claim);
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u, init]) => u === '/api/consultations/5/claim' && init?.method === 'POST')).toBe(true)
    );
    expect(await screen.findByLabelText('Your reply')).toBeInTheDocument();
  });

  it('lets the farmer read replies, reply and close', async () => {
    const detail = consultation({
      expert_id: 9,
      expert_name: 'Dr. Patil',
      status: 'answered',
      message_count: 1,
      messages: [
        {
          id: 1,
          author_id: 9,
          author_name: 'Dr. Patil',
          author_role: 'expert',
          body: 'Please send a photo.',
          image_path: null,
          created_at: '2026-11-20T12:00:00Z',
        },
      ],
    });
    renderThread(user(1, 'farmer'), detail);
    expect(await screen.findByText('Please send a photo.')).toBeInTheDocument();
    expect(await screen.findByLabelText('Your reply')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take this question' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark answered' })).toBeNull();
  });

  it('gives admins reassign and close but no reply box', async () => {
    renderThread(user(2, 'admin'), consultation({ expert_id: 9, expert_name: 'Dr. Patil', status: 'assigned' }));
    expect(await screen.findByRole('button', { name: 'Reassign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Your reply')).toBeNull();
  });

  it('shows a closed note and no actions on a closed question', async () => {
    renderThread(user(1, 'farmer'), consultation({ status: 'closed', expert_id: 9, expert_name: 'Dr. Patil' }));
    expect(await screen.findByText('This question is closed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.queryByLabelText('Your reply')).toBeNull();
  });

  it('shows the "being compiled" state while the KVK directory is empty', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/me') ? json(200, user(1, 'farmer')) : json(200, { items: [], total: 0, limit: 20, offset: 0 })
      )
    );
    renderWithProviders(<KVKConsultation />, { route: '/kvk-consultation?tab=kvks' });
    expect(await screen.findByText('KVK directory being compiled')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/api/kvks'))).toBe(true);
  });

  it('shows import help and lists districts without a KVK on the status page', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/me')
          ? json(200, user(2, 'admin'))
          : json(200, { total: 0, verified: 0, districts: [], states: [], last_verified_on: null, imports: [] })
      )
    );
    renderWithProviders(<KVKIntegration />, { route: '/admin-kvk-integration' });
    expect(await screen.findByText('No import has been run yet.')).toBeInTheDocument();
    expect(screen.getByText('uv run terrabyte-import-kvk <file.json>')).toBeInTheDocument();
    expect(screen.getByText('0 of 36')).toBeInTheDocument();
  });
});
