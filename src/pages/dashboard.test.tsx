import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { AdminAnalyticsData, DayPoint, ExpertDashboardData, HardwareDashboardData, VendorDashboardData } from '@/lib/types';
import { renderWithProviders } from '@/test/render';
import AdminDashboard from './dashboard/AdminDashboard';
import ExpertDashboard from './dashboard/ExpertDashboard';
import HardwareVendorDashboard from './dashboard/HardwareVendorDashboard';
import VendorDashboard from './dashboard/VendorDashboard';
import AIModelPerformance from './admin/AIModelPerformance';
import VendorAnalytics from './vendor/VendorAnalytics';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const days = (n = 30, fill?: Partial<DayPoint>): DayPoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, count: 0, value: 0, ...fill }));

const me = { id: 1, name: 'Demo User', role: 'vendor', status: 'approved', preferred_language: 'en' };

const vendorData: VendorDashboardData = {
  products_total: 4,
  products_active: 3,
  low_stock: [{ id: 9, name: 'DAP 18-46-0', unit: '50 kg bag', stock: 0 }],
  out_of_stock: 1,
  orders_by_status: { delivered: 1, placed: 2 },
  open_orders: 2,
  revenue_total: 2700,
  revenue_this_month: 1350.5,
  month: '2026-11',
  orders_last_30_days: days(),
  top_products: [],
  recent_orders: [],
};

describe('dashboard pages', () => {
  const fetchMock = vi.fn();
  let routes: Record<string, unknown> = {};

  beforeEach(async () => {
    localStorage.clear();
    tokenStore.set('token');
    fetchMock.mockReset();
    routes = { '/api/me': me };
    fetchMock.mockImplementation((url: string) => {
      const path = String(url).split('?')[0];
      return Promise.resolve(path in routes ? json(200, routes[path]) : json(404, { detail: 'nf', code: 'not_found' }));
    });
    vi.stubGlobal('fetch', fetchMock);
    // recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('vendor dashboard shows the numbers the API returned', async () => {
    routes['/api/dashboard/vendor'] = vendorData;
    renderWithProviders(<VendorDashboard />);
    await waitFor(() => expect(screen.getByText('₹2,700')).toBeInTheDocument());
    expect(screen.getByText('₹1,350.50')).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('1 active product out of stock')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('No orders yet.')).toBeInTheDocument();
    // No invented trend figures.
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('vendor analytics shows empty states instead of charts when there is no data', async () => {
    routes['/api/dashboard/vendor'] = { ...vendorData, orders_by_status: {} };
    renderWithProviders(<VendorAnalytics />);
    await waitFor(() => expect(screen.getAllByText('No activity in the last 30 days yet.')).toHaveLength(2));
    expect(screen.getByText('No delivered orders yet.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('vendor analytics draws a chart with a data table when there are orders', async () => {
    routes['/api/dashboard/vendor'] = { ...vendorData, orders_last_30_days: days(30, { count: 1, value: 500 }) };
    renderWithProviders(<VendorAnalytics />);
    await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
    expect(screen.getByText('Total over the last 30 days: 30')).toBeInTheDocument();
  });

  it('hardware dashboard explains utilisation and handles no machines', async () => {
    const data: HardwareDashboardData = {
      equipment_total: 0,
      equipment_active: 0,
      bookings_by_status: {},
      pending_requests: 0,
      revenue_total: 0,
      revenue_this_month: 0,
      month: '2026-11',
      utilisation: [],
      utilisation_overall: null,
      requests_last_30_days: days(),
      upcoming: [],
    };
    routes['/api/dashboard/hardware'] = data;
    renderWithProviders(<HardwareVendorDashboard />);
    await waitFor(() => expect(screen.getByText(/No active machines yet/)).toBeInTheDocument());
    expect(screen.getByText('No bookings yet.')).toBeInTheDocument();
    expect(screen.getByText('No upcoming bookings.')).toBeInTheDocument();
  });

  it('hardware dashboard shows per-machine use as a percentage', async () => {
    routes['/api/dashboard/hardware'] = {
      equipment_total: 1,
      equipment_active: 1,
      bookings_by_status: { accepted: 1 },
      pending_requests: 0,
      revenue_total: 0,
      revenue_this_month: 0,
      month: '2026-11',
      utilisation: [{ equipment_id: 1, name: 'Tractor 45 HP', booked_days: 6, days: 30, share: 0.2 }],
      utilisation_overall: 0.2,
      requests_last_30_days: days(),
      upcoming: [],
    } satisfies HardwareDashboardData;
    renderWithProviders(<HardwareVendorDashboard />);
    await waitFor(() => expect(screen.getByText('6 of 30 days · 20%')).toBeInTheDocument());
    expect(screen.getByRole('progressbar', { name: 'Tractor 45 HP' })).toHaveAttribute('aria-valuenow', '20');
  });

  it('expert dashboard says when there are no replies yet', async () => {
    const data: ExpertDashboardData = {
      open_unassigned: 2,
      waiting_for_me: 1,
      answered_by_me: 0,
      closed_by_me: 0,
      response_times: { responded: 0, median_hours: null, average_hours: null },
      articles_published: 1,
      articles_draft: 1,
      recent: [],
    };
    routes['/api/dashboard/expert'] = data;
    renderWithProviders(<ExpertDashboard />);
    await waitFor(() => expect(screen.getByText(/No replies yet/)).toBeInTheDocument());
    expect(screen.getByText('1 draft')).toBeInTheDocument();
  });

  it('admin dashboard totals come from the analytics endpoint', async () => {
    const data: AdminAnalyticsData = {
      users_by_role: { farmer: 2, vendor: 3, admin: 1 },
      users_by_status: { approved: 5, pending: 1 },
      pending_approvals: 1,
      new_users_last_30_days: days(),
      orders_by_status: { delivered: 1, placed: 1 },
      orders_last_30_days: days(),
      delivered_order_value: 533,
      bookings_by_status: {},
      completed_rental_value: 0,
      consultations_by_status: { open: 1, answered: 1 },
      response_times: { responded: 1, median_hours: 2, average_hours: 2 },
      forum_posts: 3,
      forum_replies: 2,
      open_reports: 1,
      hidden_items: 0,
      kvks: 0,
      articles_published: 1,
      products_active: 8,
      equipment_active: 5,
    };
    routes['/api/admin/analytics'] = data;
    renderWithProviders(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('Registered users')).toBeInTheDocument());
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Delivered: ₹533')).toBeInTheDocument();
    expect(screen.getByText('8 / 5')).toBeInTheDocument();
  });

  it('model performance shows only stored evaluations, with an honest empty state', async () => {
    routes['/api/admin/model-evaluations'] = { items: [], total: 0, limit: 20, offset: 0 };
    const { unmount } = renderWithProviders(<AIModelPerformance />);
    await waitFor(() => expect(screen.getByText('No evaluated models yet')).toBeInTheDocument());
    expect(screen.queryByText(/accuracy/i)).toHaveTextContent(/no accuracy figures/i);
    unmount();

    routes['/api/admin/model-evaluations'] = {
      items: [
        {
          id: 1,
          model_name: 'disease-cnn',
          version: 'v2',
          dataset: 'held-out split',
          metric_name: 'top1_accuracy',
          value: 0.9123,
          evaluated_at: '2026-12-01T10:00:00Z',
          details: null,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };
    renderWithProviders(<AIModelPerformance />);
    await waitFor(() => expect(screen.getByText('disease-cnn')).toBeInTheDocument());
    expect(screen.getByText('0.9123')).toBeInTheDocument();
  });
});
