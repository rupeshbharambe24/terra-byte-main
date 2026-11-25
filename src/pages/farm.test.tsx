import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { FarmerDashboardData, LedgerEntry, LedgerSummary } from '@/lib/types';
import { renderWithProviders } from '@/test/render';
import FarmerDashboard from './dashboard/FarmerDashboard';
import FinancialManagement from './features/FinancialManagement';
import Settings from './features/Settings';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const farmer = {
  id: 2,
  name: 'Ramesh Shinde',
  phone: '9000000011',
  email: null,
  role: 'farmer',
  status: 'approved',
  preferred_language: 'en',
  organization: null,
  qualifications: null,
  state: 'Maharashtra',
  district: 'Pune',
  village: 'Narayangaon',
  lat: 19.1167,
  lon: 73.9667,
  created_at: '2026-11-01T00:00:00Z',
};

function route(map: Record<string, unknown>) {
  return (url: string) => {
    const path = String(url).split('?')[0];
    if (path === '/api/me') return Promise.resolve(json(200, farmer));
    if (path in map) return Promise.resolve(json(200, map[path]));
    return Promise.resolve(json(404, { detail: 'nope', code: 'not_found' }));
  };
}

describe('farm pages', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    tokenStore.set('farmer-token');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    // Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
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

  it('dashboard shows the numbers returned by the API', async () => {
    const data: FarmerDashboardData = {
      fields: 2,
      total_acres: 4,
      open_orders: 3,
      recent_orders: [
        {
          id: 12,
          buyer_id: 2,
          buyer_name: 'Ramesh',
          buyer_phone: null,
          vendor_id: 5,
          vendor_name: 'Shivneri Krishi Kendra',
          status: 'shipped',
          total_inr: 1100,
          delivery_address: 'x',
          payment_method: 'cod',
          note: null,
          status_reason: null,
          created_at: '2026-11-20T00:00:00Z',
          updated_at: '2026-11-20T00:00:00Z',
          accepted_at: null,
          shipped_at: null,
          delivered_at: null,
          cancelled_at: null,
          rejected_at: null,
          items: [],
        },
      ],
      upcoming_bookings_count: 1,
      upcoming_bookings: [],
      open_consultations: 4,
      unread_notifications: 5,
      month: '2026-11',
      month_income: 0,
      month_expense: 2700,
    };
    const weather = {
      location: { lat: 19.12, lon: 73.97, source: 'profile', field_id: null, field_name: null },
      fetched_at: '2026-11-25T04:00:00Z',
      stale: false,
      today: '2026-11-25',
      daily: [
        {
          date: '2026-11-25',
          weather_code: 0,
          tmax_c: 29.4,
          tmin_c: 15.2,
          rain_mm: 0,
          rain_probability_pct: 5,
          et0_mm: 4.1,
          wind_max_kmh: 9,
          rh_max_pct: 80,
          rh_min_pct: 35,
        },
      ],
      past_daily: [],
      hourly: [],
      advisories: [
        { id: 'dry_week', severity: 'info', values: { mm: 0 }, rule: 'r', basis: 'b', source_url: null },
      ],
      attribution: { text: 'Weather data by Open-Meteo.com', url: '', license: 'CC BY 4.0', license_url: '' },
    };
    const mine = {
      crops: ['onion'],
      district: 'Pune',
      items: [
        {
          market: 'Pune(Manjri)', district: 'Pune', state: 'Maharashtra', commodity: 'Onion', variety: 'Local', grade: 'FAQ',
          arrival_date: '2026-11-24', min_price: 2000, max_price: 4000, modal_price: 3000, source: 'data.gov.in', days_old: 1, stale: false,
        },
      ],
      as_of: '2026-11-24',
    };
    fetchMock.mockImplementation(
      route({ '/api/dashboard/farmer': data, '/api/weather': weather, '/api/fields': [], '/api/prices/mine': mine })
    );
    renderWithProviders(<FarmerDashboard />, { route: '/farmer-dashboard' });
    await waitFor(() => expect(screen.getByText('Orders in progress', { selector: 'p' })).toBeInTheDocument());
    expect(screen.getByText('4 acres (160 guntha)')).toBeInTheDocument();
    expect(screen.getByText('₹2,700')).toBeInTheDocument();
    expect(screen.getByText('Order #12 · Shivneri Krishi Kendra')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(await screen.findByText('Mandi prices for your crops')).toBeInTheDocument();
    expect(await screen.findByText('Onion')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Clear, 15.2–29.4 °C, rain 0 mm/)).toBeInTheDocument());
    expect(screen.getByText(/Only 0 mm of rain expected this week/)).toBeInTheDocument();
    expect(screen.getByText('Weather data by Open-Meteo.com')).toBeInTheDocument();
    expect(screen.getByText('No field has a crop yet.')).toBeInTheDocument();
    for (const n of ['3', '4', '5']) expect(screen.getAllByText(n).length).toBeGreaterThan(0);
  });

  it('dashboard shows zeros and empty lists for a new farmer', async () => {
    const data: FarmerDashboardData = {
      fields: 0,
      total_acres: 0,
      open_orders: 0,
      recent_orders: [],
      upcoming_bookings_count: 0,
      upcoming_bookings: [],
      open_consultations: 0,
      unread_notifications: 0,
      month: '2026-11',
      month_income: 0,
      month_expense: 0,
    };
    fetchMock.mockImplementation(route({ '/api/dashboard/farmer': data }));
    renderWithProviders(<FarmerDashboard />);
    await waitFor(() => expect(screen.getByText('No orders in progress.')).toBeInTheDocument());
    expect(screen.getByText('No upcoming bookings.')).toBeInTheDocument();
    expect(screen.getByText('Add your fields in Settings')).toBeInTheDocument();
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });

  it('farm accounts show server totals and mark linked entries', async () => {
    const summary: LedgerSummary = {
      date_from: '2026-11-01',
      date_to: '2026-11-24',
      income: 5000,
      expense: 2700,
      net: 2300,
      entries: 2,
      by_month: [{ month: '2026-11', income: 5000, expense: 2700 }],
      by_category: [
        { type: 'income', category: 'crop_sale', amount: 5000 },
        { type: 'expense', category: 'farm_inputs', amount: 2700 },
      ],
      by_field: [],
    };
    const entry: LedgerEntry = {
      id: 1,
      entry_date: '2026-11-20',
      type: 'expense',
      category: 'farm_inputs',
      amount_inr: 2700,
      field_id: null,
      field_name: null,
      note: 'Marketplace order #12',
      order_id: 12,
      booking_id: null,
      created_at: '2026-11-20T00:00:00Z',
    };
    fetchMock.mockImplementation(
      route({
        '/api/fields': [],
        '/api/ledger/summary': summary,
        '/api/ledger': { items: [entry], total: 1, limit: 20, offset: 0 },
      })
    );
    renderWithProviders(<FinancialManagement />);
    await waitFor(() => expect(screen.getByText('₹5,000')).toBeInTheDocument());
    expect(screen.getByText('₹2,300')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Order #12')).toBeInTheDocument());
    expect(screen.getByText('Order #12').closest('a')).toHaveAttribute('href', '/orders/12');
    const summaryCall = fetchMock.mock.calls.find(([u]) => String(u).startsWith('/api/ledger/summary'));
    expect(String(summaryCall?.[0])).toMatch(/from=\d{4}-\d{2}-01&to=\d{4}-\d{2}-\d{2}/);
  });

  it('farm accounts show an empty state instead of figures', async () => {
    const empty: LedgerSummary = {
      date_from: null,
      date_to: null,
      income: 0,
      expense: 0,
      net: 0,
      entries: 0,
      by_month: [],
      by_category: [],
      by_field: [],
    };
    fetchMock.mockImplementation(
      route({ '/api/fields': [], '/api/ledger/summary': empty, '/api/ledger': { items: [], total: 0, limit: 20, offset: 0 } })
    );
    renderWithProviders(<FinancialManagement />);
    await waitFor(() => expect(screen.getByText('No entries in this period')).toBeInTheDocument());
    expect(screen.queryByText('Net (income − expenses)')).toBeNull();
  });

  it('settings show the profile and the farmer’s fields in acres, guntha and hectares', async () => {
    fetchMock.mockImplementation(
      route({
        '/api/fields': [
          {
            id: 1,
            name: 'Well-side plot',
            area_acres: 2.5,
            soil_type: 'Medium black',
            irrigation_source: null,
            current_crop: 'Onion',
            sowing_date: null,
            lat: null,
            lon: null,
            created_at: '2026-11-01T00:00:00Z',
          },
        ],
      })
    );
    renderWithProviders(<Settings />);
    await waitFor(() => expect(screen.getByText('Well-side plot')).toBeInTheDocument());
    expect(screen.getByText('2.5 acres · 100 guntha · 1.01 ha')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Ramesh Shinde');
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
  });
});
