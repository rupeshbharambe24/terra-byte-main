import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enLanding from '@/locales/en/landing.json';
import enAdmin from '@/locales/en/admin.json';
import enMarket from '@/locales/en/market.json';
import enRentals from '@/locales/en/rentals.json';
import enAdvice from '@/locales/en/advice.json';
import enForum from '@/locales/en/forum.json';
import enFarm from '@/locales/en/farm.json';
import enDashboard from '@/locales/en/dashboard.json';
import enAgro from '@/locales/en/agro.json';
import hiCommon from '@/locales/hi/common.json';
import hiAuth from '@/locales/hi/auth.json';
import hiLanding from '@/locales/hi/landing.json';
import hiAdmin from '@/locales/hi/admin.json';
import hiMarket from '@/locales/hi/market.json';
import hiRentals from '@/locales/hi/rentals.json';
import hiAdvice from '@/locales/hi/advice.json';
import hiForum from '@/locales/hi/forum.json';
import hiFarm from '@/locales/hi/farm.json';
import hiDashboard from '@/locales/hi/dashboard.json';
import hiAgro from '@/locales/hi/agro.json';
import mrCommon from '@/locales/mr/common.json';
import mrAuth from '@/locales/mr/auth.json';
import mrLanding from '@/locales/mr/landing.json';
import mrAdmin from '@/locales/mr/admin.json';
import mrMarket from '@/locales/mr/market.json';
import mrRentals from '@/locales/mr/rentals.json';
import mrAdvice from '@/locales/mr/advice.json';
import mrForum from '@/locales/mr/forum.json';
import mrFarm from '@/locales/mr/farm.json';
import mrDashboard from '@/locales/mr/dashboard.json';
import mrAgro from '@/locales/mr/agro.json';

export const LANGUAGES = ['en', 'hi', 'mr'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];
export const NAMESPACES = ['common', 'auth', 'landing', 'admin', 'market', 'rentals', 'advice', 'forum', 'farm', 'dashboard', 'agro'] as const;

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    landing: enLanding,
    admin: enAdmin,
    market: enMarket,
    rentals: enRentals,
    advice: enAdvice,
    forum: enForum,
    farm: enFarm,
    dashboard: enDashboard,
    agro: enAgro,
  },
  hi: {
    common: hiCommon,
    auth: hiAuth,
    landing: hiLanding,
    admin: hiAdmin,
    market: hiMarket,
    rentals: hiRentals,
    advice: hiAdvice,
    forum: hiForum,
    farm: hiFarm,
    dashboard: hiDashboard,
    agro: hiAgro,
  },
  mr: {
    common: mrCommon,
    auth: mrAuth,
    landing: mrLanding,
    admin: mrAdmin,
    market: mrMarket,
    rentals: mrRentals,
    advice: mrAdvice,
    forum: mrForum,
    farm: mrFarm,
    dashboard: mrDashboard,
    agro: mrAgro,
  },
} as const;

/** Native names, always shown in their own script. */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
};
