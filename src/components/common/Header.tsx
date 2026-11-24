import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Menu, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi } from '@/lib/api';
import { getDashboardRoute } from '@/utils/routeUtils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import NavMenu from './NavMenu';

const linkClass =
  'text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors';
const drawerLinkClass =
  'block rounded-lg px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const role = user?.role;
  const showMarketplace = role === 'farmer' || role === 'vendor';
  const showForums = role === 'farmer' || role === 'expert' || role === 'admin';

  // Unread badge: a cheap count endpoint, refreshed every minute and after marking read.
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
  const unread = isAuthenticated ? unreadData?.unread ?? 0 : 0;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 shadow-lg border-b border-green-100 dark:border-green-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              className="md:hidden -ml-1 p-2 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={menuOpen}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 shrink-0 bg-green-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white truncate">{t('appName')}</span>
            </Link>
          </div>

          <nav className="hidden md:flex gap-8" aria-label={t('nav.mainMenu')}>
            {isAuthenticated ? (
              <>
                <Link to={getDashboardRoute(role)} className={linkClass}>{t('nav.dashboard')}</Link>
                {showMarketplace && <Link to="/marketplace" className={linkClass}>{t('nav.marketplace')}</Link>}
                {showForums && <Link to="/forums" className={linkClass}>{t('nav.forums')}</Link>}
              </>
            ) : (
              <>
                <Link to="/" className={linkClass}>{t('nav.home')}</Link>
                <a href="/#features" className={linkClass}>{t('nav.features')}</a>
              </>
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageSwitcher />
            <ThemeToggle />
            {isAuthenticated && (
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                aria-label={unread > 0 ? t('notificationsBadge', { count: unread }) : t('sidebar.notifications')}
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold leading-5 text-center"
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
            )}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[12rem] truncate">
                  {t('nav.hello', { name: user?.name })}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex gap-2">
                <Link
                  to="/login"
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 px-3 py-2 rounded-lg transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] overflow-y-auto p-4 dark:bg-gray-800">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>{t('appName')}</SheetTitle>
            <SheetDescription>
              {user ? `${user.name} · ${t(`roles.${user.role}`)}` : t('nav.mainMenu')}
            </SheetDescription>
          </SheetHeader>
          {isAuthenticated ? (
            <>
              <NavMenu onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <nav className="space-y-1" aria-label={t('nav.mainMenu')}>
              <Link to="/" className={drawerLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
              <a href="/#features" className={drawerLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.features')}</a>
              <Link to="/login" className={drawerLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.login')}</Link>
              <Link to="/register" className={drawerLinkClass} onClick={() => setMenuOpen(false)}>{t('nav.register')}</Link>
            </nav>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;
