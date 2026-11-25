import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import { renderWithProviders } from '@/test/render';
import CropPlanning from './features/CropPlanning';
import GovernmentSchemes from './features/GovernmentSchemes';
import KVKConsultation from './features/KVKConsultation';
import SmartIrrigation from './features/SmartIrrigation';
import SoilFertilizer from './features/SoilFertilizer';
import WeatherForecast from './features/WeatherForecast';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const farmer = {
  id: 2,
  name: 'Ramesh',
  role: 'farmer',
  status: 'approved',
  preferred_language: 'en',
  district: 'Pune',
  state: 'Maharashtra',
  lat: 19.1167,
  lon: 73.9667,
};

const field = {
  id: 5,
  name: 'Well-side plot',
  area_acres: 2,
  soil_type: 'Medium black',
  irrigation_source: null,
  current_crop: 'onion',
  season: 'rabi',
  sowing_date: '2026-11-10',
  lat: 19.11,
  lon: 73.96,
  created_at: '2026-11-01T00:00:00Z',
};

const attribution = { text: 'Weather data by Open-Meteo.com', url: '', license: 'CC BY 4.0', license_url: '' };

function route(map: Record<string, unknown | ((url: string, init?: RequestInit) => unknown)>) {
  return (url: string, init?: RequestInit) => {
    const path = String(url).split('?')[0];
    if (path === '/api/me') return Promise.resolve(json(200, farmer));
    if (path in map) {
      const v = map[path];
      const body = typeof v === 'function' ? (v as (u: string, i?: RequestInit) => unknown)(String(url), init) : v;
      if (body instanceof Response) return Promise.resolve(body);
      return Promise.resolve(json(200, body));
    }
    return Promise.resolve(json(404, { detail: 'nope', code: 'not_found' }));
  };
}

describe('agronomy pages', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    tokenStore.set('farmer-token');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('weather page shows the forecast, advisories with their rule and the Open-Meteo attribution', async () => {
    const day = (date: string, rain: number) => ({
      date,
      weather_code: rain ? 63 : 0,
      tmax_c: 30,
      tmin_c: 16,
      rain_mm: rain,
      rain_probability_pct: rain ? 80 : 5,
      et0_mm: 4.2,
      wind_max_kmh: 12,
      rh_max_pct: 85,
      rh_min_pct: 40,
    });
    fetchMock.mockImplementation(
      route({
        '/api/fields': [field],
        '/api/weather': {
          location: { lat: 19.12, lon: 73.97, source: 'profile', field_id: null, field_name: null },
          fetched_at: '2026-11-25T04:00:00Z',
          stale: false,
          today: '2026-11-25',
          daily: [day('2026-11-25', 12), day('2026-11-26', 0)],
          past_daily: [],
          hourly: [
            {
              time: '2026-11-25T10:00',
              temp_c: 27,
              rh_pct: 50,
              precipitation_mm: 2,
              precipitation_probability_pct: 70,
              wind_kmh: 8,
              weather_code: 61,
            },
          ],
          advisories: [
            { id: 'rain_48h', severity: 'warning', values: { mm: 12 }, rule: '', basis: '', source_url: null },
          ],
          attribution,
        },
      })
    );
    renderWithProviders(<WeatherForecast />);
    await waitFor(() => expect(screen.getByText('Today')).toBeInTheDocument());
    expect(screen.getByText(/About 12 mm of rain expected in the next 48 hours/)).toBeInTheDocument();
    expect(screen.getByText(/TerraByte rule of thumb/)).toBeInTheDocument();
    expect(screen.getByText('Weather data by Open-Meteo.com')).toBeInTheDocument();
    expect(screen.getAllByText(/Evaporation \(ET0\): 4.2 mm/).length).toBe(2);
  });

  it('weather page explains a missing location instead of showing numbers', async () => {
    fetchMock.mockImplementation(
      route({
        '/api/fields': [],
        '/api/weather': json(422, { detail: 'x', code: 'no_location' }),
      })
    );
    renderWithProviders(<WeatherForecast />);
    await waitFor(() => expect(screen.getByText('Your farm location is not set')).toBeInTheDocument());
  });

  it('irrigation page shows the recommendation, totals and assumptions', async () => {
    fetchMock.mockImplementation(
      route({
        '/api/fields': [field],
        '/api/fields/5/irrigation': {
          status: 'ok',
          field_id: 5,
          field_name: 'Well-side plot',
          area_acres: 2,
          crop: 'onion',
          crop_text: 'onion',
          sowing_date: '2026-11-10',
          today: '2026-11-25',
          sources: [{ name: 'FAO-56', url: 'https://www.fao.org/4/x0490e/x0490e00.htm' }],
          attribution,
          days_after_sowing: 15,
          stage: 'development',
          kc: 0.7,
          stale_weather: false,
          params: {
            fao56_name: 'Onion dry',
            is_proxy: false,
            kc_ini: 0.7,
            kc_mid: 1.05,
            kc_end: 0.75,
            stages_days: [15, 25, 70, 40],
            stage_region: 'Mediterranean',
            root_depth_max_m: 0.45,
            p_table: 0.3,
            notes: [],
          },
          soil: { texture: 'silty_clay', awc_mm_per_m: 160, entered: false },
          balance_start: '2026-11-18',
          days: [],
          past: { days: 7, et0_mm: 28, etc_mm: 19.6, rain_mm: 0, effective_rain_mm: 0, net_need_mm: 19.6 },
          next: {
            days: 7,
            et0_mm: 29,
            etc_mm: 22,
            rain_mm: 0,
            effective_rain_mm: 0,
            net_need_mm: 22,
            litres_per_acre: 89031,
            litres_field: 178062,
          },
          recommendation: { kind: 'in_days', days: 2, net_mm: 21.6, litres_per_acre: 87412, litres_field: 174824 },
          assumptions: ['soil_texture_mapped', 'runoff_zero'],
        },
      })
    );
    renderWithProviders(<SmartIrrigation />);
    await waitFor(() =>
      expect(screen.getByText('Irrigate in about 2 days: about 21.6 mm (≈ 87,412 litres per acre).')).toBeInTheDocument()
    );
    expect(screen.getByText(/About 1,74,824 litres for this field/)).toBeInTheDocument();
    expect(screen.getByText(/Runoff is not modelled/)).toBeInTheDocument();
    expect(screen.getByText(/160 mm per metre/)).toBeInTheDocument();
    expect(screen.queryByText(/sensor/i)).toBeNull();
  });

  it('irrigation page says when a crop has no FAO-56 data', async () => {
    fetchMock.mockImplementation(
      route({
        '/api/fields': [{ ...field, current_crop: 'tur' }],
        '/api/fields/5/irrigation': { status: 'not_available', field_id: 5, crop: 'tur_pigeonpea', sources: [], attribution },
      })
    );
    renderWithProviders(<SmartIrrigation />);
    await waitFor(() => expect(screen.getByText('Not available for this crop yet')).toBeInTheDocument());
  });

  it('soil & fertilizer shows the dose with sources, the disclaimer and company-set prices', async () => {
    const amount = (ha: number) => ({ per_ha: ha, per_acre: +(ha / 2.4711).toFixed(1), per_field: +((ha * 2) / 2.4711).toFixed(1) });
    const rdf = {
      id: 30,
      crop: 'onion',
      season: 'rabi',
      condition: 'irrigated',
      variety_type: null,
      status: 'complete',
      usable: true,
      reason: null,
      n_kg_ha: 98.8,
      p2o5_kg_ha: 49.4,
      k2o_kg_ha: 49.4,
      fym_t_ha: null,
      notes: [],
      has_split: false,
      source_name: 'MPKV Krishi Darshani 2026',
      source_url: 'https://mpkv.ac.in/x.pdf',
      source_locator: 'p1',
    };
    const dosePost = vi.fn(() => ({
      crop: 'onion',
      rdf,
      scheme: 'mpkv',
      carrier: 'dap',
      area_acres: 2,
      soil_test_id: null,
      soil_test_date: null,
      ratings: [],
      dose: { n: amount(98.8), p2o5: amount(49.4), k2o: amount(49.4) },
      products: [
        {
          key: 'dap',
          name: 'DAP',
          grade: '18-46-0',
          kg: amount(107.4),
          bag_kg: 50,
          bags_per_acre: 0.9,
          bags_field: 1.7,
          cost_per_acre_inr: 1173,
          cost_field_inr: 2346,
          price_inr_per_bag: 1350,
          price_source: 'report',
          price_source_url: 'https://example.org/dap',
          price_as_of: '2026-11-11',
          s_pct: null,
        },
        {
          key: 'mop',
          name: 'MOP',
          grade: '0-0-60',
          kg: amount(82.3),
          bag_kg: null,
          bags_per_acre: null,
          bags_field: null,
          cost_per_acre_inr: null,
          cost_field_inr: null,
          price_inr_per_bag: null,
          price_source: null,
          price_source_url: null,
          price_as_of: null,
          s_pct: null,
        },
      ],
      excess: {},
      splits: [],
      micronutrients: [],
      notes: ['no_soil_test'],
      sources: [{ name: 'MPKV Krishi Darshani 2026', url: 'https://mpkv.ac.in/x.pdf', locator: 'p1' }],
      last_verified: '2026-11-24',
    }));
    fetchMock.mockImplementation(
      route({
        '/api/fields': [field],
        '/api/soil-tests': [],
        '/api/fertilizer/options': { crop: 'onion', options: [rdf], carriers: ['dap'], last_verified: '2026-11-24' },
        '/api/fertilizer/dose': dosePost,
      })
    );
    renderWithProviders(<SoilFertilizer />);
    await waitFor(() => expect(screen.getByText('Fertilizer to buy')).toBeInTheDocument());
    expect(screen.getByText('Follow your Soil Health Card / local agriculture officer')).toBeInTheDocument();
    expect(screen.getByText(/No soil test selected/)).toBeInTheDocument();
    expect(screen.getByText('price set by company')).toBeInTheDocument();
    expect(screen.getByText('1.7 bags of 50 kg')).toBeInTheDocument();
    expect(screen.getAllByText('MPKV Krishi Darshani 2026').length).toBeGreaterThan(0);
    expect(screen.getByText(/Last verified/)).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([u]) => String(u).includes('/api/fertilizer/dose'));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ crop: 'onion', rdf_id: 30, field_id: 5, soil_test_id: null });
    expect(screen.queryByText(/LIVE/)).toBeNull();
  });

  it('schemes page shows status badges, a warning for unverified schemes and the MSP note', async () => {
    const scheme = (id: string, status: string) => ({
      id,
      name_en: `${id} scheme`,
      name_hi: `${id} योजना`,
      name_mr: `${id} योजना (म)`,
      level: 'central',
      ministry_or_department: null,
      benefit: 'Rs 6,000 per year',
      eligibility: null,
      exclusions: [],
      documents_required: [],
      how_to_apply: null,
      official_url: 'https://pmkisan.gov.in/',
      status,
      status_note: null,
      last_verified: '2026-11-24',
      source_urls: [],
      notes: null,
    });
    fetchMock.mockImplementation(
      route({
        '/api/schemes': { items: [scheme('pm_kisan', 'active'), scheme('pm_kusum', 'unverified')], total: 2, notes: [], last_verified: '2026-11-24' },
      })
    );
    renderWithProviders(<GovernmentSchemes />);
    await waitFor(() => expect(screen.getByText('pm_kisan scheme')).toBeInTheDocument());
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText(/could not be confirmed from an official source/)).toBeInTheDocument();
    expect(screen.getAllByText('Official website').length).toBe(2);
    await act(async () => {
      await i18n.changeLanguage('mr');
    });
    expect(screen.getByText('pm_kisan योजना (म)')).toBeInTheDocument();
  });

  it('crop planning shows the region, sowing window, source and MSP', async () => {
    fetchMock.mockImplementation(
      route({
        '/api/fields': [],
        '/api/crop-calendar': {
          district: 'Pune',
          region: 'western_maharashtra',
          caveats: ['CRIDA plans date from 2011.'],
          last_verified: '2026-11-24',
          items: [
            {
              crop: 'wheat',
              season: 'rabi',
              season_group: 'rabi',
              notes: null,
              irrigation_supported: true,
              entries: [
                {
                  key: 'all_timely_irrigated',
                  scope: 'state',
                  sowing_window: { start: '11-01', end: '11-15', text: null },
                  duration_days: null,
                  seed_rate_kg_ha: 100,
                  seed_rate_text: null,
                  spacing_cm: '22.5 cm rows',
                  irrigated_or_rainfed: 'irrigated',
                  sowing_trigger: null,
                  source_name: 'MPKV Krishi Darshani 2026',
                  source_url: 'https://mpkv.ac.in/x.pdf',
                  source_page: 'p.80',
                },
              ],
              msp: [
                {
                  crop: 'Wheat',
                  crop_hi: 'गेहूं',
                  crop_mr: 'गहू',
                  season: 'Rabi',
                  marketing_year: '2027-28',
                  msp_inr_per_quintal: 2610,
                  source_url: 'https://pib.gov.in/x',
                  announced_on: '2026-09-30',
                },
              ],
            },
          ],
        },
      })
    );
    renderWithProviders(<CropPlanning />);
    await waitFor(() => expect(screen.getByText(/1 Nov – 15 Nov/)).toBeInTheDocument());
    expect(screen.getByText('Region: Western Maharashtra')).toBeInTheDocument();
    expect(screen.getByText(/MSP Wheat: ₹2,610 per quintal \(2027-28\)/)).toBeInTheDocument();
    expect(screen.getByText('MPKV Krishi Darshani 2026')).toBeInTheDocument();
  });

  it('KVK directory shows the nearest KVKs with distance and an approximate-location note', async () => {
    const kvk = {
      id: 1,
      name: 'KVK Narayangaon (Pune-II)',
      district: 'Pune',
      state: 'Maharashtra',
      host_organisation: 'Grape Growers',
      taluka: 'Junnar',
      address: 'Narayangaon, Pune',
      pincode: '410504',
      phone: '02132-242320, 9999999999',
      email: 'kvk@x.in',
      website: null,
      lat: 19.12,
      lon: 73.97,
      coords_precision: 'town-level (OSM place node for Narayangaon); not the KVK campus',
      coords_approximate: true,
      source_url: 'https://icar.org.in/en/node/15040',
      sources: [],
      verified_on: '2026-11-24',
      created_at: '2026-11-24T00:00:00Z',
    };
    fetchMock.mockImplementation(
      route({
        '/api/kvks/nearest': [{ ...kvk, distance_km: 0.4 }],
        '/api/kvks': { items: [kvk], total: 1, limit: 20, offset: 0 },
      })
    );
    renderWithProviders(<KVKConsultation />, { route: '/kvk-consultation?tab=kvks' });
    await waitFor(() => expect(screen.getByText('KVKs nearest to you')).toBeInTheDocument());
    expect(screen.getByText('≈ 0 km')).toBeInTheDocument();
    expect(screen.getAllByText(/Map point is approximate/).length).toBe(2);
    expect(screen.getAllByRole('link', { name: '9999999999' })[0]).toHaveAttribute('href', 'tel:9999999999');
    expect(screen.getAllByRole('link', { name: 'Directions' })[0]).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Narayangaon%2C%20Pune'
    );
  });
});
