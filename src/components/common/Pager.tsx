import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PagerProps {
  page: number; // zero-based
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

/** Previous / next controls for limit-offset lists. Renders nothing for a single page. */
const Pager: React.FC<PagerProps> = ({ page, total, pageSize, onPage }) => {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
        {t('pager.previous')}
      </Button>
      <span className="text-sm text-gray-600 dark:text-gray-400">{t('pager.page', { page: page + 1, pages })}</span>
      <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
        {t('pager.next')}
      </Button>
    </div>
  );
};

export default Pager;
