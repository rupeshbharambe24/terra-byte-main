import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import Header from '@/components/common/Header';
import { renderWithProviders } from '@/test/render';
import Forums from './features/Forums';
import ForumPost from './features/ForumPost';
import ContentModeration from './admin/ContentModeration';
import Notifications from './features/Notifications';

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const farmer = { id: 1, name: 'Ramesh', role: 'farmer', status: 'approved', preferred_language: 'en' };
const admin = { id: 9, name: 'Admin', role: 'admin', status: 'approved', preferred_language: 'en' };
const author = (id: number, name: string, role = 'farmer') => ({ id, name, role });

const post = {
  id: 5,
  author: author(2, 'Sunita'),
  title: 'Soil testing lab near Niphad',
  body: 'Has anyone had their soil tested near Niphad?',
  category: 'soil_water',
  crop: 'Grape',
  image_path: null,
  moderation_status: 'published',
  reply_count: 1,
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
};
const detail = {
  ...post,
  replies: [
    {
      id: 11,
      post_id: 5,
      author: author(1, 'Ramesh'),
      body: 'Ask at the taluka office.',
      moderation_status: 'published',
      created_at: '2026-11-21T10:00:00Z',
    },
  ],
};

type Handler = (url: string, init: RequestInit) => Response | undefined;

describe('forum, moderation and notifications', () => {
  const fetchMock = vi.fn();
  const calls = () => fetchMock.mock.calls.map(([u, init]) => `${(init as RequestInit)?.method ?? 'GET'} ${u}`);

  function serve(me: object, handler: Handler) {
    fetchMock.mockImplementation((url: string, init: RequestInit = {}) => {
      if (url === '/api/me') return Promise.resolve(json(200, me));
      if (url.startsWith('/api/notifications/unread-count')) return Promise.resolve(json(200, { unread: 0 }));
      return Promise.resolve(handler(url, init) ?? json(404, { detail: 'Not found', code: 'not_found' }));
    });
  }

  beforeEach(async () => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    tokenStore.set('token');
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists posts from the API with filters', async () => {
    serve(farmer, (url) =>
      url.startsWith('/api/forum/posts') ? json(200, { items: [post], total: 1, limit: 20, offset: 0 }) : undefined
    );
    renderWithProviders(<Forums />, { route: '/forums' });
    await waitFor(() => expect(screen.getByText('Soil testing lab near Niphad')).toBeInTheDocument());
    expect(screen.getByText('1 reply')).toBeInTheDocument();
    expect(screen.getByText('Soil and water')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Soil testing lab/ })).toHaveAttribute('href', '/forums/5');

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(calls().some((c) => c.includes('mine=true'))).toBe(true));
  });

  it('shows report on others’ content and delete on your own', async () => {
    serve(farmer, (url, init) => {
      if (url === '/api/forum/posts/5') return json(200, detail);
      if (url === '/api/forum/posts/5/report' && init.method === 'POST') return json(204, undefined);
      return undefined;
    });
    renderWithProviders(
      <Routes>
        <Route path="/forums/:postId" element={<ForumPost />} />
      </Routes>,
      { route: '/forums/5' }
    );
    await waitFor(() => expect(screen.getByText('Ask at the taluka office.')).toBeInTheDocument());
    // Post is by someone else: report, no delete. Reply is mine: delete, no report.
    expect(screen.getAllByRole('button', { name: 'Report' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Hide' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(within(dialog).getByText('Write at least 3 characters.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Advertisement' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(calls()).toContain('POST /api/forum/posts/5/report'));
    const body = fetchMock.mock.calls.find(([u]) => u === '/api/forum/posts/5/report')?.[1]?.body;
    expect(JSON.parse(String(body))).toEqual({ reason: 'Advertisement' });
  });

  it('shows a friendly state for a hidden (404) post', async () => {
    serve(farmer, () => undefined);
    renderWithProviders(
      <Routes>
        <Route path="/forums/:postId" element={<ForumPost />} />
      </Routes>,
      { route: '/forums/77' }
    );
    await waitFor(() => expect(screen.getByText('This post is not available')).toBeInTheDocument());
  });

  it('admins hide reported content and dismiss reports', async () => {
    const report = {
      id: 3,
      reporter: author(1, 'Ramesh'),
      reason: 'Advert',
      status: 'open',
      created_at: '2026-11-22T10:00:00Z',
      resolved_at: null,
      target_type: 'post',
      target_id: 5,
      post_id: 5,
      target_title: 'Selling drip rolls',
      target_body: 'Call me.',
      target_author: author(2, 'Sunita'),
      target_status: 'published',
    };
    serve(admin, (url, init) => {
      if (url.startsWith('/api/admin/forum/reports?')) return json(200, { items: [report], total: 1, limit: 20, offset: 0 });
      if (init.method === 'POST') return json(204, undefined);
      return undefined;
    });
    renderWithProviders(<ContentModeration />, { route: '/admin-content' });
    await waitFor(() => expect(screen.getByText('Selling drip rolls')).toBeInTheDocument());
    expect(calls().some((c) => c.includes('/api/admin/forum/reports?status=open'))).toBe(true);
    expect(screen.getByRole('link', { name: 'Open the post' })).toHaveAttribute('href', '/forums/5');

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Advertising' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(calls()).toContain('POST /api/admin/forum/posts/5/hide'));

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss report' }));
    await waitFor(() => expect(calls()).toContain('POST /api/admin/forum/reports/3/dismiss'));
  });

  it('notifications: mark one read, mark all read, open the link', async () => {
    let unread = 2;
    const items = [
      { id: 1, type: 'order_shipped', title: 'Order #4 shipped', body: 'On its way.', link: '/orders/4', read_at: null, created_at: '2026-11-24T08:00:00Z' },
      { id: 2, type: 'forum_reply', title: 'New reply', body: null, link: null, read_at: null, created_at: '2026-11-23T08:00:00Z' },
    ];
    serve(farmer, (url, init) => {
      if (url.startsWith('/api/notifications?')) return json(200, { items, unread, total: 2, limit: 20, offset: 0 });
      if (init.method === 'POST') {
        unread = url.endsWith('/read-all') ? 0 : Math.max(0, unread - 1);
        return json(204, undefined);
      }
      return undefined;
    });
    renderWithProviders(
      <Routes>
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/orders/:id" element={<p>order page</p>} />
      </Routes>,
      { route: '/notifications' }
    );
    await waitFor(() => expect(screen.getByText('Order #4 shipped')).toBeInTheDocument());
    expect(screen.getByText('2 unread')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark as read' })[1]);
    await waitFor(() => expect(calls()).toContain('POST /api/notifications/2/read'));

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(calls()).toContain('POST /api/notifications/read-all'));

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByText('order page')).toBeInTheDocument());
    expect(calls()).toContain('POST /api/notifications/1/read');
  });

  it('header shows the unread badge', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/me') return Promise.resolve(json(200, farmer));
      if (url.startsWith('/api/notifications/unread-count')) return Promise.resolve(json(200, { unread: 3 }));
      return Promise.resolve(json(404, {}));
    });
    renderWithProviders(<Header />);
    const bell = await screen.findByRole('link', { name: '3 unread notifications' });
    expect(bell).toHaveAttribute('href', '/notifications');
    expect(bell).toHaveTextContent('3');
  });
});
