import React from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageSpinner from '@/components/common/PageSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { agroApi } from '@/lib/agro';
import { recommendationText } from '@/lib/agroText';
import { farmApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { FIELDS_KEY } from '@/lib/farm';

const MAX_FIELDS = 3;

/** Irrigation status (FAO-56 water balance) for up to three fields that have a crop. */
const IrrigationCard: React.FC = () => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const fields = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });
  const withCrop = (fields.data ?? []).filter((f) => f.current_crop).slice(0, MAX_FIELDS);
  const results = useQueries({
    queries: withCrop.map((f) => ({
      queryKey: ['irrigation', f.id, {}],
      queryFn: () => agroApi.irrigation(f.id),
      staleTime: 10 * 60 * 1000,
    })),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-5 w-5 text-green-600" aria-hidden="true" />
          {t('dashboard.irrigationTitle')}
        </CardTitle>
        <Link to="/smart-irrigation" className="text-sm text-green-700 hover:underline dark:text-green-400">
          {t('dashboard.details')}
        </Link>
      </CardHeader>
      <CardContent>
        {fields.isLoading ? (
          <PageSpinner />
        ) : withCrop.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.noCropFields')}{' '}
            <Link to="/crop-planning" className="text-green-700 hover:underline dark:text-green-400">
              {t('dashboard.planCrop')}
            </Link>
          </p>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {withCrop.map((f, i) => {
              const r = results[i];
              return (
                <li key={f.id} className="py-2 text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{f.name}</span>
                  <span className="block text-gray-600 dark:text-gray-400">
                    {r?.isLoading ? '…' : r?.isError ? errorMessage(t, r.error) : r?.data ? recommendationText(t, r.data, lng) : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default IrrigationCard;
