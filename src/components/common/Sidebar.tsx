import React from 'react';
import { Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import NavMenu from './NavMenu';

/** Desktop sidebar (md and up). On small screens the same menu lives in the header drawer. */
const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <aside className="hidden md:block w-64 shrink-0 bg-white dark:bg-gray-800 shadow-lg h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('appName')}</h2>
            {user && <p className="text-sm text-gray-500 dark:text-gray-400">{t(`roles.${user.role}`)}</p>}
          </div>
        </div>
        <NavMenu />
      </div>
    </aside>
  );
};

export default Sidebar;
