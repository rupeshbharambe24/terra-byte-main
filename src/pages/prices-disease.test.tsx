import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { DiseaseCheck } from '@/lib/disease';
import type { PriceForecast as Forecast, PriceRow } from '@/lib/prices';
import { renderWithProviders } from '@/test/render';
import PricesCard from '@/components/dashboard/PricesCard';
import DiseaseDetection from './features/DiseaseDetection';
import PriceForecast from './features/PriceForecast';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const me = { id: 1, name: 'Asha', role: 'farmer', status: 'approved', preferred_language: 'en' };

const row = (over: Partial<PriceRow> = {}): PriceRow => ({
  market: 'Pune(Manjri)',
  district: 'Pune',
  state: 'Maharashtra',
  commodity: 'Onion',
  variety: 'Local',
  grade: 'FAQ',
  arrival_date: '2026-11-24',
  min_price: 2000,
  max_price: 4000,
  modal_price: 3000,
  source: 'data.gov.in',
  days_old: 1,
  stale: false,
  ...over,
});

const okForecast: Forecast = {
  status: 'ok',
  market: 'Pune(Manjri)',
  commodity: 'Onion',
  variety: 'Local',
  last_date: '2026-11-24',
  last_price: 3000,
  days_old: 1,
  method: 'ets',
  points: [{ date: '2026-11-25', horizon_days: 1, point: 3010, low: 2700, high: 3300 }],
  ranges: [{ date: '2026-12-08', horizon_days: 14, point: null, low: 2200, high: 3900 }],
  skill: {
    mase_naive: 1.2,
    mase_seasonal_naive: 1.5,
    mase_ets: 0.9,
    coverage_80: 0.78,
    n_origins: 60,
    first_origin: '2026-09-01',
    last_origin: '2026-11-20',
    evaluated_at: '2026-11-25T00:00:00Z',
  },
};

describe('prices and disease pages', () => {
  const fetchMock = vi.fn();
  let routes: Record<string, unknown> = {};

  beforeEach(async () => {
    localStorage.clear();
    tokenStore.set('token');
    fetchMock.mockReset();
    routes = { '/api/me': me };
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url).split('?')[0];
      const key = `${init?.method ?? 'GET'} ${path}`;
      const body = key in routes ? routes[key] : routes[path];
      return Promise.resolve(body !== undefined ? json(200, body) : json(404, { detail: 'nf', code: 'not_found' }));
    });
    vi.stubGlobal('fetch', fetchMock);
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

  function priceRoutes(forecast: Forecast, latest: PriceRow[] = [row()]) {
    Object.assign(routes, {
      '/api/prices/commodities': [{ commodity: 'Onion', markets: 1, last_date: '2026-11-24' }],
      '/api/prices/latest': { items: latest, as_of: '2026-11-24', stale_after_days: 7 },
      '/api/prices/series': [
        { market: 'Pune(Manjri)', commodity: 'Onion', district: 'Pune', state: 'Maharashtra', rows: 113, first_date: '2026-08-01', last_date: '2026-11-24' },
      ],
      '/api/prices/history': {
        market: 'Pune(Manjri)',
        commodity: 'Onion',
        variety: 'Local',
        district: 'Pune',
        points: [{ date: '2026-11-24', modal: 3000, min: 2000, max: 4000 }],
        sources: ['data.gov.in'],
      },
      '/api/prices/forecast': forecast,
      '/api/prices/msp': { commodity: 'Onion', has_msp: false, rows: [], note: 'No MSP' },
    });
  }

  it('shows real latest prices, the backtested forecast and no invented MSP', async () => {
    priceRoutes(okForecast);
    renderWithProviders(<PriceForecast />);
    expect(await screen.findByText('Data as of 24 Nov 2026')).toBeInTheDocument();
    expect(await screen.findByText(/25% more accurate than repeating the last price/)).toBeInTheDocument();
    expect(screen.getByText(/80% range contained the real price 78% of the time/)).toBeInTheDocument();
    expect(await screen.findByText(/No MSP is announced for Onion/)).toBeInTheDocument();
    expect(screen.queryByText(/best time to sell/i)).not.toBeInTheDocument();
  });

  it('never forecasts from stale data and warns about old prices', async () => {
    priceRoutes(
      { ...okForecast, status: 'stale', method: null, points: [], ranges: [], skill: null, last_date: '2025-05-27', days_old: 547 },
      [row({ arrival_date: '2025-05-27', stale: true, days_old: 547 })]
    );
    renderWithProviders(<PriceForecast />);
    expect(await screen.findByText(/Some prices are more than 7 days old/)).toBeInTheDocument();
    expect(await screen.findByText(/Forecast unavailable: data not current/)).toBeInTheDocument();
    expect(screen.queryByText('Expected')).not.toBeInTheDocument();
  });

  it('dashboard card lists prices for the farmer crops', async () => {
    routes['/api/prices/mine'] = { crops: ['onion'], district: 'Pune', items: [row()], as_of: '2026-11-24' };
    renderWithProviders(<PricesCard />);
    expect(await screen.findByText('Onion')).toBeInTheDocument();
    expect(screen.getByText(/Pune\(Manjri\)/)).toBeInTheDocument();
  });

  it('dashboard card asks for a crop when the farmer has none', async () => {
    routes['/api/prices/mine'] = { crops: [], district: 'Pune', items: [], as_of: null };
    renderWithProviders(<PricesCard />);
    expect(await screen.findByText(/Add the crop you grow/)).toBeInTheDocument();
  });

  const check = (over: Partial<DiseaseCheck> = {}): DiseaseCheck => ({
    id: 7,
    crop: 'tomato',
    status: 'uncertain',
    reason: 'low_confidence',
    image_url: '/api/files/images/u1/a.jpg',
    top3: [
      { class_id: 'tomato__early_blight', condition: 'early_blight', probability: 0.55, info: null },
      { class_id: 'tomato__target_spot', condition: 'target_spot', probability: 0.3, info: null },
    ],
    model_version: 'v1',
    consultation_id: null,
    created_at: '2026-11-25T05:00:00Z',
    ...over,
  });

  it('uploads a photo, shows an uncertain result and asks an expert', async () => {
    routes['/api/disease/model'] = {
      available: true,
      version: 'disease-mnv3l-v1',
      crops: [{ id: 'tomato', name: 'Tomato', conditions: ['early_blight'] }],
      licence: 'CC-BY-4.0',
    };
    routes['/api/disease/checks'] = { items: [], total: 0, limit: 10, offset: 0 };
    routes['POST /api/disease/checks'] = check();
    routes['POST /api/disease/checks/7/ask-expert'] = check({ consultation_id: 42 });
    renderWithProviders(<DiseaseDetection />);
    expect(await screen.findByText('No checks yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Crop'), { target: { value: 'tomato' } });
    const file = new File([new Uint8Array([1, 2, 3])], 'leaf.jpg', { type: 'image/jpeg' });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    fireEvent.change(screen.getByLabelText('Leaf photo'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Check photo' }));

    expect(await screen.findByText(/The model is not sure/)).toBeInTheDocument();
    expect(screen.getByText('early blight')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([u, init]) => String(u) === '/api/disease/checks' && init?.method === 'POST');
    expect((post?.[1]?.body as FormData).get('crop')).toBe('tomato');

    fireEvent.click(screen.getByRole('button', { name: 'Ask an expert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send photo and result' }));
    expect(await screen.findByRole('link', { name: 'Open consultation' })).toHaveAttribute('href', '/consultations/42');
  });

  it('explains a rejected photo and says when the model is missing', async () => {
    routes['/api/disease/model'] = { available: true, version: 'v1', crops: [{ id: 'tomato', name: 'Tomato', conditions: [] }], licence: null };
    routes['/api/disease/checks'] = {
      items: [check({ id: 8, status: 'rejected', reason: 'not_a_supported_leaf', top3: [] })],
      total: 1,
      limit: 10,
      offset: 0,
    };
    renderWithProviders(<DiseaseDetection />);
    fireEvent.click(await screen.findByRole('button', { name: /Tomato/ }));
    await waitFor(() => expect(screen.getByText(/does not look like a leaf of a supported crop/)).toBeInTheDocument());
  });

  it('shows that the model is not installed', async () => {
    routes['/api/disease/model'] = { available: false, version: null, crops: [], licence: null };
    routes['/api/disease/checks'] = { items: [], total: 0, limit: 10, offset: 0 };
    renderWithProviders(<DiseaseDetection />);
    expect(await screen.findByText(/not installed/)).toBeInTheDocument();
  });
});
