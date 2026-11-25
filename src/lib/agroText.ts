import type { TFunction } from 'i18next';
import type { IrrigationData } from './agro';
import { formatNumber } from './format';

/** One-line irrigation status, also used on the dashboard. */
export function recommendationText(t: TFunction, d: IrrigationData, lng?: string) {
  if (d.status !== 'ok' || !d.recommendation) return t(`irrigation.status.${d.status}`);
  const r = d.recommendation;
  const values = {
    days: r.days ?? 0,
    mm: formatNumber(r.net_mm, lng, 1),
    litres: formatNumber(r.litres_per_acre, lng, 0),
  };
  return t(`irrigation.rec.${r.kind}`, values);
}

