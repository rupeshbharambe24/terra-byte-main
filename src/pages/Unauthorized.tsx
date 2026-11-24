import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/common/Header';
import { useAuth } from '@/context/AuthContext';
import { getDashboardRoute } from '@/utils/routeUtils';

const Unauthorized: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-md">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-600 mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('unauthorized.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{t('unauthorized.body')}</p>
          <Link
            to={user ? getDashboardRoute(user.role) : '/'}
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg"
          >
            {user ? t('unauthorized.dashboard') : t('unauthorized.home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
