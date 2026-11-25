// Mandi prices, MSP and backtested forecasts: types, API calls and pure helpers.
import { api } from './api';

export interface PriceRow {
  market: string;
  district: string;
  state: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: number | null;
  max_price: number | null;
  modal_price: number;
  source: string;
  days_old: number;
  stale: boolean;
}

export interface LatestPrices {
  items: PriceRow[];
  as_of: string | null;
  stale_after_days: number;
}

export interface MyPrices {
  crops: string[];
  district: string | null;
  items: PriceRow[];
  as_of: string | null;
}

export interface CommodityInfo {
  commodity: string;
  markets: number;
  last_date: string;
}

export interface PriceSeries {
  market: string;
  commodity: string;
  district: string;
  state: string;
  rows: number;
  first_date: string;
  last_date: string;
}

export interface HistoryPoint {
  date: string;
  modal: number;
  min: number | null;
  max: number | null;
}

export interface PriceHistory {
  market: string;
  commodity: string;
  variety: string;
  district: string;
  points: HistoryPoint[];
  sources: string[];
}

export interface ForecastPoint {
  date: string;
  horizon_days: number;
  point: number | null;
  low: number;
  high: number;
}

export interface ForecastSkill {
  mase_naive: number;
  mase_seasonal_naive: number;
  mase_ets: number;
  coverage_80: number | null;
  n_origins: number;
  first_origin: string;
  last_origin: string;
  evaluated_at: string;
}

export type ForecastStatus = 'ok' | 'stale' | 'not_evaluated' | 'no_data';

export interface PriceForecast {
  status: ForecastStatus;
  market: string;
  commodity: string;
  variety: string | null;
  last_date: string | null;
  last_price: number | null;
  days_old: number | null;
  method: 'ets' | 'naive' | null;
  points: ForecastPoint[];
  ranges: ForecastPoint[];
  skill: ForecastSkill | null;
}

export interface MspRow {
  crop: string;
  crop_hi: string | null;
  crop_mr: string | null;
  season: string;
  marketing_year: string;
  msp_inr_per_quintal: number;
  source_url: string;
  announced_on: string | null;
}

export interface MspInfo {
  commodity: string;
  has_msp: boolean;
  rows: MspRow[];
  note: string | null;
}

export const pricesApi = {
  commodities: () => api.get<CommodityInfo[]>('/prices/commodities'),
  series: (commodity?: string) => api.get<PriceSeries[]>('/prices/series', { commodity }),
  latest: (q: { commodity?: string; district?: string; market?: string } = {}) =>
    api.get<LatestPrices>('/prices/latest', q),
  mine: () => api.get<MyPrices>('/prices/mine'),
  history: (market: string, commodity: string, days = 365) =>
    api.get<PriceHistory>('/prices/history', { market, commodity, days }),
  forecast: (market: string, commodity: string) =>
    api.get<PriceForecast>('/prices/forecast', { market, commodity }),
  msp: (commodity: string) => api.get<MspInfo>('/prices/msp', { commodity }),
};

export const PRICE_STALE_DAYS = 7;

/** Agmarknet commodity names are long ("Arhar (Tur/Red Gram)(Whole)"); keep the first part. */
export function shortCommodity(name: string): string {
  const cut = name.split('(')[0].trim();
  return cut || name;
}

/** Group latest rows by commodity, newest first inside each group. */
export function groupByCommodity(rows: PriceRow[]): Array<[string, PriceRow[]]> {
  const groups = new Map<string, PriceRow[]>();
  for (const r of rows) {
    const list = groups.get(r.commodity) ?? [];
    list.push(r);
    groups.set(r.commodity, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, list]) => [k, [...list].sort((x, y) => y.arrival_date.localeCompare(x.arrival_date) || x.market.localeCompare(y.market))]);
}

export interface ChartRow {
  date: string;
  modal?: number;
  forecast?: number;
  band?: [number, number];
}

/** History (last `days` points) followed by the 1-7 day forecast with its 80 % band. */
export function chartRows(history: HistoryPoint[], forecast: ForecastPoint[] | undefined, days = 120): ChartRow[] {
  const rows: ChartRow[] = history.slice(-days).map((p) => ({ date: p.date, modal: p.modal }));
  if (forecast && forecast.length && rows.length) {
    const last = rows[rows.length - 1];
    // Start the forecast line at the last observed price so the two lines join.
    last.forecast = last.modal;
    last.band = [last.modal as number, last.modal as number];
    for (const f of forecast) {
      if (f.point === null) continue;
      rows.push({ date: f.date, forecast: f.point, band: [f.low, f.high] });
    }
  }
  return rows;
}

/** Percent better (positive) or worse than the naive forecast, from MASE values. */
export function skillVsNaive(skill: ForecastSkill, method: 'ets' | 'naive'): number {
  if (method === 'naive' || skill.mase_naive <= 0) return 0;
  return Math.round((1 - skill.mase_ets / skill.mase_naive) * 100);
}

/** "market|commodity" key for selects. */
export const seriesKey = (market: string, commodity: string) => `${market}|${commodity}`;
export function parseSeriesKey(key: string): { market: string; commodity: string } | null {
  const i = key.indexOf('|');
  if (i <= 0) return null;
  return { market: key.slice(0, i), commodity: key.slice(i + 1) };
}
