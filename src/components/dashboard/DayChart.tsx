import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { isAllZero, shortDay } from '@/lib/dashboard';
import type { DayPoint } from '@/lib/types';

interface DayChartProps {
  series: DayPoint[] | undefined;
  metric: 'count' | 'value';
  /** Accessible name of the chart. */
  label: string;
  emptyText: string;
  format: (n: number) => string;
  color?: string;
}

/** Bars per IST day for the last 30 days, with the same numbers available as a table. */
const DayChart: React.FC<DayChartProps> = ({ series, metric, label, emptyText, format, color = '#16a34a' }) => {
  const { t, i18n } = useTranslation(['dashboard']);
  const lng = i18n.resolvedLanguage;
  if (!series || isAllZero(series, metric)) {
    return <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>;
  }
  const data = series.map((p) => ({ day: shortDay(p.date, lng), v: p[metric], date: p.date }));
  const total = series.reduce((acc, p) => acc + p[metric], 0);
  return (
    <figure>
      <div
        className="h-56 w-full text-gray-500 dark:text-gray-400"
        role="img"
        aria-label={t('chart.summary', { title: label, total: format(total) })}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis
              allowDecimals={metric === 'value'}
              tick={{ fill: 'currentColor', fontSize: 11 }}
              width={metric === 'value' ? 64 : 32}
              tickFormatter={(n: number) => (metric === 'value' ? format(n) : String(n))}
            />
            <Tooltip
              formatter={(v: number) => [format(v), label]}
              contentStyle={{ fontSize: 12 }}
              cursor={{ fill: 'currentColor', fillOpacity: 0.08 }}
            />
            <Bar dataKey="v" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {t('chart.total', { total: format(total) })}
      </figcaption>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-green-700 dark:text-green-400">{t('chart.showData')}</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-1 pr-2 font-medium">{t('chart.date')}</th>
                <th className="py-1 font-medium">{label}</th>
              </tr>
            </thead>
            <tbody>
              {series
                .filter((p) => p[metric])
                .map((p) => (
                  <tr key={p.date}>
                    <td className="py-0.5 pr-2">{shortDay(p.date, lng)}</td>
                    <td className="py-0.5 tabular-nums">{format(p[metric])}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
};

export default DayChart;
