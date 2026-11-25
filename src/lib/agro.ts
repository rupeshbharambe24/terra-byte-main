// Weather, irrigation, soil & fertilizer, crop planning, schemes and MSP: types, API calls and
// pure helpers (tested in agro.test.ts). All numbers come from the API; nothing is invented here.
import { api } from './api';
import type { KVK, KVKNearest } from './types';

// ---- Shared ----------------------------------------------------------------------------------

export interface SourceRef {
  name: string;
  url: string | null;
  locator?: string | null;
}

export interface Attribution {
  text: string;
  url: string;
  license: string;
  license_url: string;
}

/** Crop keys used by every agronomy reference file (names in agro:crops.*). */
export const CROP_KEYS = [
  'cotton_bt',
  'soybean',
  'tur_pigeonpea',
  'chickpea_gram',
  'wheat',
  'rice_paddy',
  'jowar_sorghum',
  'bajra_pearl_millet',
  'maize',
  'sugarcane',
  'onion',
  'tomato',
  'potato',
  'okra_bhendi',
  'brinjal',
  'chilli',
  'groundnut',
  'grapes',
  'pomegranate',
  'banana',
] as const;
export type CropKey = (typeof CROP_KEYS)[number];

const CROP_ALIASES: Record<string, CropKey> = {
  cotton: 'cotton_bt',
  'bt cotton': 'cotton_bt',
  soyabean: 'soybean',
  tur: 'tur_pigeonpea',
  arhar: 'tur_pigeonpea',
  gram: 'chickpea_gram',
  chickpea: 'chickpea_gram',
  harbhara: 'chickpea_gram',
  rice: 'rice_paddy',
  paddy: 'rice_paddy',
  jowar: 'jowar_sorghum',
  sorghum: 'jowar_sorghum',
  bajra: 'bajra_pearl_millet',
  corn: 'maize',
  grape: 'grapes',
  okra: 'okra_bhendi',
  bhendi: 'okra_bhendi',
  bhindi: 'okra_bhendi',
  chili: 'chilli',
  peanut: 'groundnut',
};

/** Crop key for a stored crop value (key or common English name); null if unknown. */
export function toCropKey(value: string | null | undefined): CropKey | null {
  if (!value) return null;
  const text = value.trim().toLowerCase().replace(/\s+/g, ' ');
  const key = text.replace(/ /g, '_');
  if ((CROP_KEYS as readonly string[]).includes(key)) return key as CropKey;
  return CROP_ALIASES[text] ?? null;
}

// ---- Weather ---------------------------------------------------------------------------------

export interface WeatherDay {
  date: string;
  weather_code: number | null;
  tmax_c: number | null;
  tmin_c: number | null;
  rain_mm: number | null;
  rain_probability_pct: number | null;
  et0_mm: number | null;
  wind_max_kmh: number | null;
  rh_max_pct: number | null;
  rh_min_pct: number | null;
}

export interface WeatherHour {
  time: string;
  temp_c: number | null;
  rh_pct: number | null;
  precipitation_mm: number | null;
  precipitation_probability_pct: number | null;
  wind_kmh: number | null;
  weather_code: number | null;
}

export type AdvisoryId = 'rain_48h' | 'wind_spray' | 'heavy_rain' | 'heat' | 'cold' | 'dry_week';

export interface Advisory {
  id: AdvisoryId;
  severity: 'warning' | 'info';
  values: Record<string, string | number>;
  rule: string;
  basis: string;
  source_url: string | null;
}

export interface WeatherLocation {
  lat: number;
  lon: number;
  source: 'query' | 'field' | 'profile';
  field_id: number | null;
  field_name: string | null;
}

export interface WeatherData {
  location: WeatherLocation;
  fetched_at: string;
  stale: boolean;
  today: string;
  daily: WeatherDay[];
  past_daily: WeatherDay[];
  hourly: WeatherHour[];
  advisories: Advisory[];
  attribution: Attribution;
}

/** WMO weather code (Open-Meteo) -> translation key under agro:weather.codes.* */
export function weatherCodeKey(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'unknown';
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'unknown';
}

// ---- Irrigation ------------------------------------------------------------------------------

export type IrrigationStatus =
  | 'ok'
  | 'no_crop'
  | 'unknown_crop'
  | 'not_available'
  | 'no_sowing_date'
  | 'not_sown'
  | 'season_over';

export interface IrrigationDay {
  date: string;
  forecast: boolean;
  stage: string;
  kc: number | null;
  et0_mm: number;
  etc_mm: number;
  rain_mm: number;
  effective_rain_mm: number;
  depletion_mm: number;
  raw_mm: number;
  taw_mm: number;
}

export interface WaterTotals {
  days: number;
  et0_mm: number;
  etc_mm: number;
  rain_mm: number;
  effective_rain_mm: number;
  net_need_mm: number;
  litres_per_acre?: number;
  litres_field?: number;
}

export interface IrrigationData {
  status: IrrigationStatus;
  field_id: number;
  field_name: string;
  area_acres: number;
  crop: CropKey | null;
  crop_text: string | null;
  sowing_date: string | null;
  today: string;
  sources: SourceRef[];
  attribution: Attribution;
  days_after_sowing?: number;
  stage?: string;
  kc?: number | null;
  stale_weather?: boolean;
  params?: {
    fao56_name: string;
    is_proxy: boolean;
    kc_ini: number;
    kc_mid: number;
    kc_end: number;
    stages_days: number[];
    stage_region: string | null;
    root_depth_max_m: number;
    p_table: number;
    notes: string[];
  };
  soil?: { texture: string | null; awc_mm_per_m: number; entered: boolean };
  balance_start?: string;
  days?: IrrigationDay[];
  past?: WaterTotals;
  next?: WaterTotals;
  recommendation?: {
    kind: 'today' | 'in_days' | 'not_within_window' | 'not_applicable';
    days: number | null;
    net_mm: number | null;
    litres_per_acre: number | null;
    litres_field: number | null;
  };
  assumptions?: string[];
}

export const SOIL_TEXTURES = [
  'clay',
  'silty_clay',
  'silty_clay_loam',
  'silt_loam',
  'loam',
  'sandy_loam',
  'loamy_sand',
  'sand',
] as const;
export type SoilTexture = (typeof SOIL_TEXTURES)[number];

export interface IrrigationQuery {
  soil_texture?: SoilTexture;
  awc_mm_per_m?: number;
  last_irrigated?: string;
}

/** Litres of water for a depth of `mm` over `acres` (1 mm on 1 m² = 1 litre). */
export function litresFor(mm: number, acres: number): number {
  return mm * 4046.8564 * acres;
}

// ---- Soil & fertilizer -----------------------------------------------------------------------

export interface SoilTest {
  id: number;
  field_id: number;
  test_date: string;
  lab: string | null;
  ph: number | null;
  ec_ds_m: number | null;
  oc_pct: number | null;
  n_kg_ha: number | null;
  p_kg_ha: number | null;
  p_basis: 'P' | 'P2O5';
  k_kg_ha: number | null;
  k_basis: 'K' | 'K2O';
  s_ppm: number | null;
  zn_ppm: number | null;
  fe_ppm: number | null;
  mn_ppm: number | null;
  cu_ppm: number | null;
  b_ppm: number | null;
  created_at: string;
}

export type SoilTestInput = Omit<SoilTest, 'id' | 'field_id' | 'created_at'>;

export const SOIL_VALUE_KEYS = [
  'n_kg_ha',
  'p_kg_ha',
  'k_kg_ha',
  'oc_pct',
  'ph',
  'ec_ds_m',
  's_ppm',
  'zn_ppm',
  'fe_ppm',
  'mn_ppm',
  'cu_ppm',
  'b_ppm',
] as const;
export type SoilValueKey = (typeof SOIL_VALUE_KEYS)[number];

export interface RDFOption {
  id: number;
  crop: CropKey;
  season: string | null;
  condition: string | null;
  variety_type: string | null;
  status: 'complete' | 'partial' | 'conflict_flagged';
  usable: boolean;
  reason: 'conflict_flagged' | 'per_plant' | 'no_numbers' | null;
  n_kg_ha: number | null;
  p2o5_kg_ha: number | null;
  k2o_kg_ha: number | null;
  fym_t_ha: number | null;
  notes: string[];
  has_split: boolean;
  source_name: string;
  source_url: string | null;
  source_locator: string | null;
}

export const CARRIERS = ['dap', 'ssp', 'npk_10_26_26', 'npk_12_32_16', 'aps_20_20_0_13'] as const;
export type Carrier = (typeof CARRIERS)[number];

export interface Amount {
  per_ha: number;
  per_acre: number;
  per_field: number | null;
}

export interface DoseProduct {
  key: string;
  name: string;
  grade: string;
  kg: Amount;
  bag_kg: number | null;
  bags_per_acre: number | null;
  bags_field: number | null;
  cost_per_acre_inr: number | null;
  cost_field_inr: number | null;
  price_inr_per_bag: number | null;
  price_source: string | null;
  price_source_url: string | null;
  price_as_of: string | null;
  s_pct: number | null;
}

export interface Rating {
  nutrient: 'N' | 'P' | 'K' | 'OC';
  entered: number | null;
  basis: string;
  value: number | null;
  class: string | null;
  factor: number | null;
}

export interface DoseResult {
  crop: CropKey;
  rdf: RDFOption;
  scheme: 'mpkv' | 'national';
  carrier: Carrier;
  area_acres: number | null;
  soil_test_id: number | null;
  soil_test_date: string | null;
  ratings: Rating[];
  dose: { n: Amount; p2o5: Amount; k2o: Amount };
  products: DoseProduct[];
  excess: Record<string, Amount>;
  splits: {
    timing: string | null;
    text: string | null;
    n: Amount;
    p2o5: Amount;
    k2o: Amount;
    products: Record<string, Amount>;
  }[];
  micronutrients: {
    nutrient: string;
    value_ppm: number;
    critical_limit_ppm: number;
    deficient: boolean;
    source: string;
    source_url: string;
  }[];
  notes: string[];
  sources: SourceRef[];
  last_verified: string;
}

export interface DoseInput {
  crop: string;
  rdf_id?: number | null;
  field_id?: number | null;
  area_acres?: number | null;
  soil_test_id?: number | null;
  scheme?: 'mpkv' | 'national';
  carrier?: Carrier;
}

// ---- Crop calendar ---------------------------------------------------------------------------

export interface CalendarEntry {
  key: string;
  scope: 'district' | 'region' | 'state';
  sowing_window: { start: string | null; end: string | null; text: string | null } | null;
  duration_days: number | { min: number; max: number } | null;
  seed_rate_kg_ha: number | { min: number; max: number } | null;
  seed_rate_text: string | null;
  spacing_cm: string | null;
  irrigated_or_rainfed: string | null;
  sowing_trigger: string | null;
  source_name: string | null;
  source_url: string | null;
  source_page: string | null;
}

export interface MSPRow {
  crop: string;
  crop_hi: string;
  crop_mr: string;
  season: string;
  marketing_year: string;
  msp_inr_per_quintal: number;
  increase_over_previous?: number;
  source_url: string;
  announced_on: string;
}

export interface CalendarItem {
  crop: CropKey;
  season: string;
  season_group: 'kharif' | 'rabi' | 'summer' | 'other';
  entries: CalendarEntry[];
  notes: string | null;
  irrigation_supported: boolean;
  msp: MSPRow[];
}

export interface CropCalendar {
  district: string | null;
  region: string | null;
  items: CalendarItem[];
  caveats: string[];
  last_verified: string;
}

/** "06-15" -> "15 Jun" in the UI language. */
export function formatMonthDay(mmdd: string | null | undefined, language?: string): string {
  if (!mmdd) return '—';
  const [m, d] = mmdd.split('-').map(Number);
  if (!m || !d) return mmdd;
  const locale = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }[language ?? 'en'] ?? 'en-IN';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2001, m - 1, d))
  );
}

/** Number or {min,max} range as text, e.g. "82–115". */
export function rangeText(value: number | { min: number; max: number } | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return String(value);
  return value.min === value.max ? String(value.min) : `${value.min}–${value.max}`;
}

// ---- Schemes + MSP ---------------------------------------------------------------------------

export type SchemeStatus = 'active' | 'changed' | 'closed' | 'unverified';

export interface Scheme {
  id: string;
  name_en: string;
  name_hi: string;
  name_mr: string;
  level: 'central' | 'maharashtra';
  ministry_or_department: string | null;
  benefit: string | null;
  eligibility: string | null;
  exclusions: string[] | null;
  documents_required: string[] | null;
  how_to_apply: string | null;
  official_url: string | null;
  status: SchemeStatus;
  status_note: string | null;
  last_verified: string;
  source_urls: string[] | null;
  notes: string | null;
}

export interface SchemeList {
  items: Scheme[];
  total: number;
  notes: string[];
  last_verified: string;
}

export interface MSPData {
  seasons: { season: string; marketing_year: string; latest: boolean; rows: MSPRow[] }[];
  sugarcane_frp: {
    crop: string;
    crop_hi: string;
    crop_mr: string;
    sugar_season: string;
    frp_inr_per_quintal: number;
    basic_recovery_rate_pct: number;
    source_url: string;
    announced_on: string;
    note: string;
  }[];
  notes: string[];
  last_verified: string;
}

/** Name in the UI language from a record with name_en / name_hi / name_mr (or crop, crop_hi…). */
export function localName(
  row: { name_en?: string; name_hi?: string; name_mr?: string; crop?: string; crop_hi?: string; crop_mr?: string },
  language: string | undefined
): string {
  const en = row.name_en ?? row.crop ?? '';
  if (language === 'hi') return row.name_hi || row.crop_hi || en;
  if (language === 'mr') return row.name_mr || row.crop_mr || en;
  return en;
}

// ---- KVK helpers -----------------------------------------------------------------------------

export function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Map link: exact point when the KVK published it, otherwise a search for the address. */
export function directionsUrl(kvk: Pick<KVK, 'lat' | 'lon' | 'address' | 'name' | 'coords_approximate'>): string | null {
  if (kvk.lat !== null && kvk.lon !== null && kvk.coords_approximate === false) {
    return `https://www.google.com/maps/dir/?api=1&destination=${kvk.lat},${kvk.lon}`;
  }
  const query = kvk.address || kvk.name;
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

// ---- API -------------------------------------------------------------------------------------

export const agroApi = {
  weather: (q: { lat?: number; lon?: number; field_id?: number } = {}) => api.get<WeatherData>('/weather', { ...q }),
  irrigation: (fieldId: number, q: IrrigationQuery = {}) =>
    api.get<IrrigationData>(`/fields/${fieldId}/irrigation`, { ...q }),
  soilTests: (fieldId?: number) => api.get<SoilTest[]>('/soil-tests', { field_id: fieldId }),
  createSoilTest: (fieldId: number, data: Partial<SoilTestInput>) =>
    api.post<SoilTest>(`/fields/${fieldId}/soil-tests`, data),
  deleteSoilTest: (id: number) => api.delete<void>(`/soil-tests/${id}`),
  fertilizerCrops: () => api.get<{ crop: CropKey; usable: number; total: number }[]>('/fertilizer/crops'),
  fertilizerOptions: (crop: string) =>
    api.get<{ crop: CropKey; options: RDFOption[]; carriers: Carrier[]; last_verified: string }>('/fertilizer/options', {
      crop,
    }),
  dose: (data: DoseInput) => api.post<DoseResult>('/fertilizer/dose', data),
  calendar: (district?: string) => api.get<CropCalendar>('/crop-calendar', { district }),
  schemes: (q: { level?: string; status?: string; q?: string } = {}) => api.get<SchemeList>('/schemes', { ...q }),
  msp: () => api.get<MSPData>('/msp'),
  nearestKvks: (q: { lat?: number; lon?: number; limit?: number } = {}) => api.get<KVKNearest[]>('/kvks/nearest', { ...q }),
};
