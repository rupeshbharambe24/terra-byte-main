import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/common/Header';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-md">
          <p className="text-5xl font-bold text-green-600 mb-4">404</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('notFound.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{t('notFound.body')}</p>
          <Link to="/" className="text-green-700 dark:text-green-400 hover:underline font-semibold">
            {t('notFound.home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
