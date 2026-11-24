import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './navConfig';

interface NavMenuProps {
  onNavigate?: () => void;
}

/** Role-based navigation links, shared by the desktop sidebar and the mobile drawer. */
const NavMenu: React.FC<NavMenuProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  if (!user) return null;

  return (
    <nav className="space-y-1" aria-label={t('nav.mainMenu')}>
      {NAV_ITEMS[user.role].map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors',
              active
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="font-medium">{t(`sidebar.${item.key}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default NavMenu;
