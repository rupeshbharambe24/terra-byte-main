import React from 'react';
import { Link } from 'react-router-dom';
import { CloudOff, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

/** "No location" / "unavailable" states shared with the dashboard card. */
const WeatherError: React.FC<{ error: unknown }> = ({ error }) => {
  const { t } = useTranslation('agro');
  if (error instanceof ApiError && error.code === 'no_location') {
    return (
      <EmptyState
        icon={MapPin}
        title={t('weather.noLocation')}
        body={t('weather.noLocationBody')}
        action={
          <Button asChild variant="outline">
            <Link to="/settings">{t('common.openSettings')}</Link>
          </Button>
        }
      />
    );
  }
  if (error instanceof ApiError && error.code === 'weather_unavailable') {
    return <EmptyState icon={CloudOff} title={t('weather.unavailable')} body={t('weather.unavailableBody')} />;
  }
  return <ErrorAlert error={error} />;
};

export default WeatherError;
