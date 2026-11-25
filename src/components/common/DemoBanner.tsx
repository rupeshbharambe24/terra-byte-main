import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Shown above every page that still displays placeholder data. */
const DemoBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="bg-amber-100 text-amber-900 border-b border-amber-300 dark:bg-amber-900/60 dark:text-amber-100 dark:border-amber-700"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-start gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">{t('demoBanner.title')}</strong>
          <span className="hidden sm:inline"> · {t('demoBanner.body')}</span>
        </p>
      </div>
    </div>
  );
};

export default DemoBanner;
