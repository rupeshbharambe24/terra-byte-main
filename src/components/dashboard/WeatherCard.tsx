import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CloudSun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Advisories from '@/components/agro/Advisories';
import { WeatherAttribution } from '@/components/agro/SourceNote';
import WeatherError from '@/components/agro/WeatherError';
import PageSpinner from '@/components/common/PageSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { agroApi, weatherCodeKey } from '@/lib/agro';
import { formatNumber } from '@/lib/format';

/** Today's weather and advisories for the farmer's profile location. */
const WeatherCard: React.FC = () => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const query = useQuery({ queryKey: ['weather', 'profile'], queryFn: () => agroApi.weather(), staleTime: 10 * 60 * 1000 });
  const today = query.data?.daily[0];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudSun className="h-5 w-5 text-green-600" aria-hidden="true" />
          {t('dashboard.weatherTitle')}
        </CardTitle>
        <Link to="/weather-forecast" className="text-sm text-green-700 hover:underline dark:text-green-400">
          {t('dashboard.sevenDays')}
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <PageSpinner />
        ) : query.isError ? (
          <WeatherError error={query.error} />
        ) : today ? (
          <>
            <p className="text-sm">
              {t('dashboard.weatherLine', {
                sky: t(`weather.codes.${weatherCodeKey(today.weather_code)}`),
                min: formatNumber(today.tmin_c, lng, 1),
                max: formatNumber(today.tmax_c, lng, 1),
                rain: formatNumber(today.rain_mm, lng, 1),
                chance: formatNumber(today.rain_probability_pct, lng, 0),
              })}
            </p>
            <Advisories items={query.data!.advisories} compact />
            <WeatherAttribution />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default WeatherCard;
