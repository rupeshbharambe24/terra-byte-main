import React from 'react';
import { Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import { useAuth } from '@/context/AuthContext';
import { getDashboardRoute } from '@/utils/routeUtils';

interface ComingSoonProps {
  /** Keys under common:comingSoon.* for a specific feature; generic text otherwise. */
  titleKey?: string;
  bodyKey?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ titleKey = 'title', bodyKey = 'body' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Hourglass className="mx-auto h-12 w-12 text-green-600 mb-4" aria-hidden="true" />
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
          {t('comingSoon.title')}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t(`comingSoon.${titleKey}`)}
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300">{t(`comingSoon.${bodyKey}`)}</p>
        <Link
          to={getDashboardRoute(user?.role)}
          className="mt-8 inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg"
        >
          {t('comingSoon.back')}
        </Link>
      </div>
    </AppShell>
  );
};

export default ComingSoon;
