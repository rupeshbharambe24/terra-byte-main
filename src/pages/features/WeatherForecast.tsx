import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Advisories from '@/components/agro/Advisories';
import WeatherError from '@/components/agro/WeatherError';
import { Caution, WeatherAttribution } from '@/components/agro/SourceNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { agroApi, weatherCodeKey, type WeatherHour } from '@/lib/agro';
import { farmApi } from '@/lib/api';
import { FIELDS_KEY } from '@/lib/farm';
import { formatDateTime, formatNumber } from '@/lib/format';

const PROFILE = 'profile';

function dayName(iso: string, language?: string): string {
  const locale = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }[language ?? 'en'] ?? 'en-IN';
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}

function hourLabel(time: string, language?: string): string {
  const locale = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }[language ?? 'en'] ?? 'en-IN';
  // Open-Meteo returns local (IST) wall-clock times without an offset.
  return new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${time}:00Z`)
  );
}

const n = (v: number | null | undefined, lng?: string, d = 1) => formatNumber(v ?? null, lng, d);

const HourlyTable: React.FC<{ hours: WeatherHour[] }> = ({ hours }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
            <th className="py-2 pr-2 font-medium">{t('weather.time')}</th>
            <th className="py-2 pr-2 font-medium">{t('weather.sky')}</th>
            <th className="py-2 pr-2 text-right font-medium">{t('weather.temp')}</th>
            <th className="py-2 pr-2 text-right font-medium">{t('weather.rain')}</th>
            <th className="py-2 pr-2 text-right font-medium">{t('weather.rainChance')}</th>
            <th className="py-2 pr-2 text-right font-medium">{t('weather.wind')}</th>
            <th className="py-2 text-right font-medium">{t('weather.humidity')}</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.time} className="border-b last:border-0 dark:border-gray-800">
              <td className="py-1.5 pr-2 whitespace-nowrap">{hourLabel(h.time, lng)}</td>
              <td className="py-1.5 pr-2">{t(`weather.codes.${weatherCodeKey(h.weather_code)}`)}</td>
              <td className="py-1.5 pr-2 text-right">{n(h.temp_c, lng)} °C</td>
              <td className="py-1.5 pr-2 text-right">{n(h.precipitation_mm, lng)} mm</td>
              <td className="py-1.5 pr-2 text-right">{n(h.precipitation_probability_pct, lng, 0)}%</td>
              <td className="py-1.5 pr-2 text-right">{n(h.wind_kmh, lng, 0)} km/h</td>
              <td className="py-1.5 text-right">{n(h.rh_pct, lng, 0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const WeatherForecast: React.FC = () => {
  const { t, i18n } = useTranslation(['agro', 'common']);
  const lng = i18n.resolvedLanguage;
  const [place, setPlace] = useState<string>(PROFILE);
  const [showAllHours, setShowAllHours] = useState(false);
  const fields = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });
  const located = (fields.data ?? []).filter((f) => f.lat !== null && f.lon !== null);
  const fieldId = place === PROFILE ? undefined : Number(place);
  const query = useQuery({
    queryKey: ['weather', fieldId ?? PROFILE],
    queryFn: () => agroApi.weather(fieldId ? { field_id: fieldId } : {}),
    staleTime: 10 * 60 * 1000,
  });
  const data = query.data;

  return (
    <AppShell>
      <PageHeader title={t('weather.title')} subtitle={t('weather.subtitle')} />
      {located.length > 0 && (
        <div className="mb-4 max-w-sm">
          <Select value={place} onValueChange={setPlace}>
            <SelectTrigger aria-label={t('weather.location')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PROFILE}>{t('weather.profileLocation')}</SelectItem>
              {located.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <WeatherError error={query.error} />
      ) : data ? (
        <div className="space-y-6">
          {data.stale && <Caution>{t('weather.stale', { time: formatDateTime(data.fetched_at, lng) })}</Caution>}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('weather.advisoriesTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Advisories items={data.advisories} />
            </CardContent>
          </Card>

          <section aria-labelledby="days-title">
            <h2 id="days-title" className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t('weather.next7')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {data.daily.map((d) => (
                <Card key={d.date}>
                  <CardContent className="space-y-1 p-3 text-sm">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {d.date === data.today ? t('weather.today') : dayName(d.date, lng)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{t(`weather.codes.${weatherCodeKey(d.weather_code)}`)}</p>
                    <p>
                      {n(d.tmin_c, lng)}–{n(d.tmax_c, lng)} °C
                    </p>
                    <p>
                      {t('weather.rain')}: {n(d.rain_mm, lng)} mm ({n(d.rain_probability_pct, lng, 0)}%)
                    </p>
                    <p>
                      {t('weather.et0')}: {n(d.et0_mm, lng)} mm
                    </p>
                    <p>
                      {t('weather.wind')}: {n(d.wind_max_kmh, lng, 0)} km/h
                    </p>
                    <p>
                      {t('weather.humidity')}: {n(d.rh_min_pct, lng, 0)}–{n(d.rh_max_pct, lng, 0)}%
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('weather.next48')}</CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyTable hours={showAllHours ? data.hourly : data.hourly.filter((_, i) => i % 3 === 0)} />
              <Button variant="link" className="px-0" onClick={() => setShowAllHours((v) => !v)}>
                {showAllHours ? t('weather.every3h') : t('weather.everyHour')}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              {t('weather.forLocation', {
                lat: formatNumber(data.location.lat, lng, 2),
                lon: formatNumber(data.location.lon, lng, 2),
              })}{' '}
              · {t('weather.updated', { time: formatDateTime(data.fetched_at, lng) })}
            </p>
            <p className="text-xs text-gray-500">{t('weather.et0Help')}</p>
            <WeatherAttribution />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default WeatherForecast;
