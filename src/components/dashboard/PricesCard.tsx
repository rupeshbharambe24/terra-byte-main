import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/QueryState';
import { formatDate, formatMoney } from '@/lib/format';
import { pricesApi, shortCommodity } from '@/lib/prices';

/** Farmer dashboard: latest mandi prices for the crops on the farmer's fields (real data only). */
const PricesCard: React.FC = () => {
  const { t, i18n } = useTranslation('prices');
  const lng = i18n.resolvedLanguage;
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['prices', 'mine'], queryFn: pricesApi.mine });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{t('card.title')}</CardTitle>
        <Link to="/price-forecast" className="text-sm text-green-700 hover:underline dark:text-green-400">
          {t('card.viewAll')}
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">…</p>
        ) : isError || !data ? (
          <ErrorAlert error={error} />
        ) : data.crops.length === 0 && data.items.length === 0 ? (
          <p className="text-sm text-gray-500">{t('card.noCrops')}</p>
        ) : data.items.length === 0 ? (
          <p className="text-sm text-gray-500">{t('card.none')}</p>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {data.items.slice(0, 6).map((r) => (
              <li key={`${r.market}|${r.commodity}|${r.variety}|${r.grade}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{shortCommodity(r.commodity)}</span>
                  <span className="block text-xs text-gray-500">
                    {r.market}
                    {r.variety ? ` · ${r.variety}` : ''} · {formatDate(r.arrival_date, lng)}
                    {r.stale && <span className="ml-1 text-amber-700 dark:text-amber-400">({t('card.stale')})</span>}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatMoney(r.modal_price, lng)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-gray-500">{t('attribution')}</p>
      </CardContent>
    </Card>
  );
};

export default PricesCard;
