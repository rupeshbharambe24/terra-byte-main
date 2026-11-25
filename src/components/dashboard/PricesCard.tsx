import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Mandi prices on the farmer dashboard. Placeholder until the mandi-price ingestion lands
 * (filled in by the price/forecast work); it shows no numbers until then.
 */
const PricesCard: React.FC = () => {
  const { t } = useTranslation('agro');
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-3 p-4">
        <TrendingUp className="h-6 w-6 shrink-0 text-gray-400" aria-hidden="true" />
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{t('dashboard.pricesTitle')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.pricesBody')}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricesCard;
