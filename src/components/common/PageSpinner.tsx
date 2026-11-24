import React from 'react';
import { useTranslation } from 'react-i18next';

const PageSpinner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" aria-hidden="true" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
};

export default PageSpinner;
