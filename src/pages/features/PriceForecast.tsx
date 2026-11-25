import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, LineChart as LineChartIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import {
  PRICE_STALE_DAYS,
  chartRows,
  groupByCommodity,
  parseSeriesKey,
  pricesApi,
  seriesKey,
  shortCommodity,
  skillVsNaive,
  type MspRow,
  type PriceForecast as Forecast,
} from '@/lib/prices';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600';

const ForecastPanel: React.FC<{ forecast: Forecast }> = ({ forecast }) => {
  const { t, i18n } = useTranslation('prices');
  const lng = i18n.resolvedLanguage;
  if (forecast.status === 'stale') {
    return (
      <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        {t('forecast.stale', { date: formatDate(forecast.last_date, lng), days: forecast.days_old ?? 0 })}
      </p>
    );
  }
  if (forecast.status !== 'ok' || !forecast.skill || !forecast.method) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">{t(forecast.status === 'no_data' ? 'forecast.noData' : 'forecast.notEvaluated')}</p>;
  }
  const skill = forecast.skill;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {forecast.method === 'ets'
          ? t('forecast.methodEts', { pct: skillVsNaive(skill, 'ets') })
          : t('forecast.methodNaive')}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('forecast.date')}</TableHead>
            <TableHead className="text-right">{t('forecast.expected')}</TableHead>
            <TableHead className="text-right">{t('forecast.range')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forecast.points.map((p) => (
            <TableRow key={p.date}>
              <TableCell>{formatDate(p.date, lng)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(p.point, lng)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(p.low, lng)} – {formatMoney(p.high, lng)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {forecast.ranges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium">{t('forecast.weeksTitle')}</h4>
          <ul className="mt-1 space-y-1 text-sm">
            {forecast.ranges.map((r) => (
              <li key={r.date} className="flex flex-wrap justify-between gap-2">
                <span>{t('forecast.inDays', { date: formatDate(r.date, lng), days: r.horizon_days })}</span>
                <span className="tabular-nums">
                  {formatMoney(r.low, lng)} – {formatMoney(r.high, lng)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {skill.coverage_80 !== null && (
        <p className="text-xs text-gray-500">
          {t('forecast.coverage', { pct: Math.round(skill.coverage_80 * 100), n: skill.n_origins })}
        </p>
      )}
      <p className="text-xs text-gray-500">{t('forecast.disclaimer')}</p>
    </div>
  );
};

const MspPanel: React.FC<{ commodity: string }> = ({ commodity }) => {
  const { t, i18n } = useTranslation('prices');
  const lng = i18n.resolvedLanguage;
  const { data } = useQuery({ queryKey: ['prices', 'msp', commodity], queryFn: () => pricesApi.msp(commodity) });
  if (!data) return null;
  const cropName = (r: MspRow) => (lng === 'hi' ? r.crop_hi : lng === 'mr' ? r.crop_mr : null) || r.crop;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('msp.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {data.has_msp ? (
          <ul className="space-y-1">
            {data.rows.map((r) => (
              <li key={`${r.crop}-${r.marketing_year}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  {cropName(r)} · {t('msp.season', { season: r.season, year: r.marketing_year })}
                </span>
                <span className="font-semibold tabular-nums">
                  {t('msp.perQuintal', { price: formatMoney(r.msp_inr_per_quintal, lng) })}{' '}
                  <a href={r.source_url} target="_blank" rel="noreferrer" className="text-xs font-normal text-green-700 underline dark:text-green-400">
                    {t('msp.source')}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('msp.none', { commodity: shortCommodity(commodity) })}</p>
        )}
        <p className="text-xs text-gray-500">{t('msp.note')}</p>
      </CardContent>
    </Card>
  );
};

const PriceForecast: React.FC = () => {
  const { t, i18n } = useTranslation(['prices', 'common']);
  const lng = i18n.resolvedLanguage;
  const [commodity, setCommodity] = useState('');
  const [district, setDistrict] = useState('');
  const [selected, setSelected] = useState('');

  const commodities = useQuery({ queryKey: ['prices', 'commodities'], queryFn: pricesApi.commodities });
  const latest = useQuery({
    queryKey: ['prices', 'latest', commodity, district],
    queryFn: () => pricesApi.latest({ commodity: commodity || undefined, district: district.trim() || undefined }),
  });
  const series = useQuery({
    queryKey: ['prices', 'series', commodity],
    queryFn: () => pricesApi.series(commodity || undefined),
  });

  // Default chart: the most recently updated series for the current filter.
  useEffect(() => {
    const list = series.data ?? [];
    if (!list.length) return;
    if (selected && list.some((s) => seriesKey(s.market, s.commodity) === selected)) return;
    const best = [...list].sort((a, b) => b.last_date.localeCompare(a.last_date) || b.rows - a.rows)[0];
    setSelected(seriesKey(best.market, best.commodity));
  }, [series.data, selected]);

  const choice = parseSeriesKey(selected);
  const history = useQuery({
    queryKey: ['prices', 'history', selected],
    queryFn: () => pricesApi.history(choice!.market, choice!.commodity, 365),
    enabled: !!choice,
  });
  const forecast = useQuery({
    queryKey: ['prices', 'forecast', selected],
    queryFn: () => pricesApi.forecast(choice!.market, choice!.commodity),
    enabled: !!choice,
  });
  const rows = useMemo(
    () => chartRows(history.data?.points ?? [], forecast.data?.status === 'ok' ? forecast.data.points : undefined),
    [history.data, forecast.data]
  );
  const grouped = useMemo(() => groupByCommodity(latest.data?.items ?? []), [latest.data]);
  const anyStale = (latest.data?.items ?? []).some((r) => r.stale);

  return (
    <AppShell>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          <span>{t('filters.commodity')}</span>
          <select className={selectClass} value={commodity} onChange={(e) => { setCommodity(e.target.value); setSelected(''); }}>
            <option value="">{t('filters.allCommodities')}</option>
            {(commodities.data ?? []).map((c) => (
              <option key={c.commodity} value={c.commodity}>
                {shortCommodity(c.commodity)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>{t('filters.district')}</span>
          <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('filters.districtPlaceholder')} />
        </label>
      </div>

      {latest.isLoading ? (
        <PageSpinner />
      ) : latest.isError || !latest.data ? (
        <ErrorAlert error={latest.error} />
      ) : latest.data.items.length === 0 ? (
        <EmptyState icon={LineChartIcon} title={t('latest.empty')} body={t('latest.emptyBody')} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('latest.title')}</CardTitle>
              {latest.data.as_of && <p className="text-sm text-gray-600 dark:text-gray-400">{t('latest.asOf', { date: formatDate(latest.data.as_of, lng) })}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {anyStale && (
                <p role="status" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('latest.staleWarning', { days: PRICE_STALE_DAYS })}
                </p>
              )}
              {grouped.map(([name, items]) => (
                <section key={name}>
                  <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{shortCommodity(name)}</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('latest.market')}</TableHead>
                          <TableHead className="hidden sm:table-cell">{t('latest.variety')}</TableHead>
                          <TableHead>{t('latest.date')}</TableHead>
                          <TableHead className="hidden md:table-cell text-right">{t('latest.min')}</TableHead>
                          <TableHead className="hidden md:table-cell text-right">{t('latest.max')}</TableHead>
                          <TableHead className="text-right">{t('latest.modal')}</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((r) => (
                          <TableRow key={`${r.market}|${r.variety}|${r.grade}`}>
                            <TableCell>
                              <div>{r.market}</div>
                              <div className="text-xs text-gray-500">{r.district}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{r.variety || '—'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(r.arrival_date, lng)}
                              {r.stale && <div className="text-xs text-amber-700 dark:text-amber-400">{t('latest.old', { days: r.days_old })}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right tabular-nums">{formatMoney(r.min_price, lng)}</TableCell>
                            <TableCell className="hidden md:table-cell text-right tabular-nums">{formatMoney(r.max_price, lng)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{formatMoney(r.modal_price, lng)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => setSelected(seriesKey(r.market, r.commodity))}>
                                {t('latest.chart')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              ))}
              <p className="text-xs text-gray-500">{t('attribution')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('history.title')}</CardTitle>
              <label className="mt-2 block space-y-1 text-sm font-medium">
                <span>{t('history.choose')}</span>
                <select className={selectClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {!selected && <option value="">{t('history.chooseHint')}</option>}
                  {(series.data ?? []).map((s) => (
                    <option key={seriesKey(s.market, s.commodity)} value={seriesKey(s.market, s.commodity)}>
                      {shortCommodity(s.commodity)} · {s.market} ({formatDate(s.last_date, lng)})
                    </option>
                  ))}
                </select>
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              {history.isError ? (
                <ErrorAlert error={history.error} />
              ) : history.data ? (
                <>
                  <p className="text-xs text-gray-500">
                    {history.data.variety && t('history.variety', { variety: history.data.variety })}{' '}
                    {t('history.points', { count: Math.min(history.data.points.length, 120) })}
                  </p>
                  <div className="h-72 w-full" aria-label={t('history.title')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d, lng)} minTickGap={40} fontSize={12} />
                        <YAxis width={64} fontSize={12} tickFormatter={(v: number) => formatNumber(v, lng, 0)} domain={['auto', 'auto']} />
                        <Tooltip
                          labelFormatter={(d) => formatDate(String(d), lng)}
                          formatter={(v: number | [number, number]) =>
                            Array.isArray(v) ? `${formatMoney(v[0], lng)} – ${formatMoney(v[1], lng)}` : formatMoney(v, lng)
                          }
                        />
                        <Legend />
                        <Area dataKey="band" name={t('history.band')} stroke="none" fill="#16a34a" fillOpacity={0.15} isAnimationActive={false} />
                        <Line dataKey="modal" name={t('history.modal')} stroke="#15803d" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line dataKey="forecast" name={t('history.forecast')} stroke="#ca8a04" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : choice ? (
                <PageSpinner />
              ) : null}

              {forecast.data && (
                <section>
                  <h3 className="mb-2 font-semibold">{t('forecast.title')}</h3>
                  <ForecastPanel forecast={forecast.data} />
                </section>
              )}
            </CardContent>
          </Card>

          {choice && <MspPanel commodity={choice.commodity} />}
        </div>
      )}
    </AppShell>
  );
};

export default PriceForecast;
