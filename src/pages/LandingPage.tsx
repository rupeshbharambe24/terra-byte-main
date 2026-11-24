import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bug,
  CloudSun,
  FlaskConical,
  Languages,
  LineChart,
  ShoppingCart,
  Tractor,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/common/Header';

interface Feature {
  key: string;
  icon: LucideIcon;
  available: boolean;
}

// Honest status: only what actually works today is marked "available".
const FEATURES: Feature[] = [
  { key: 'accounts', icon: UserCheck, available: true },
  { key: 'languages', icon: Languages, available: true },
  { key: 'marketplace', icon: ShoppingCart, available: false },
  { key: 'rentals', icon: Tractor, available: false },
  { key: 'advice', icon: Users, available: false },
  { key: 'fertilizer', icon: FlaskConical, available: false },
  { key: 'weather', icon: CloudSun, available: false },
  { key: 'prices', icon: LineChart, available: false },
  { key: 'disease', icon: Bug, available: false },
];

const REPO_URL = 'https://github.com/rupeshbharambe24/terra-byte-main';

const LandingPage: React.FC = () => {
  const { t } = useTranslation(['landing', 'common']);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Terra<span className="text-green-600">Byte</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3.5 rounded-lg text-lg font-semibold transition-colors"
            >
              {t('hero.getStarted')}
            </Link>
            <Link
              to="/login"
              className="border-2 border-green-600 text-green-700 dark:text-green-400 hover:bg-green-600 hover:text-white px-8 py-3.5 rounded-lg text-lg font-semibold transition-colors"
            >
              {t('hero.signIn')}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10">
        <div className="max-w-3xl mx-auto rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/40 dark:border-amber-700 p-5">
          <h2 className="font-semibold text-amber-900 dark:text-amber-100">{t('status.title')}</h2>
          <p className="mt-1 text-amber-900 dark:text-amber-100">{t('status.body')}</p>
        </div>
      </section>

      <section id="features" className="py-14 sm:py-20 bg-white dark:bg-gray-800 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-10 sm:mb-14">
            {t('features.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ key, icon: Icon, available }) => (
              <div key={key} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-green-700 dark:text-green-300" aria-hidden="true" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      available
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {available ? t('features.badge.available') : t('features.badge.inProgress')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{t(`features.items.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold text-white">{t('common:appName')}</p>
            <p className="text-sm text-gray-400">{t('footer.tagline')} {t('footer.license')}</p>
          </div>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white underline">
            {t('footer.source')}
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
