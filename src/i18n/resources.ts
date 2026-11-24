import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enLanding from '@/locales/en/landing.json';
import enAdmin from '@/locales/en/admin.json';
import hiCommon from '@/locales/hi/common.json';
import hiAuth from '@/locales/hi/auth.json';
import hiLanding from '@/locales/hi/landing.json';
import hiAdmin from '@/locales/hi/admin.json';
import mrCommon from '@/locales/mr/common.json';
import mrAuth from '@/locales/mr/auth.json';
import mrLanding from '@/locales/mr/landing.json';
import mrAdmin from '@/locales/mr/admin.json';

export const LANGUAGES = ['en', 'hi', 'mr'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];
export const NAMESPACES = ['common', 'auth', 'landing', 'admin'] as const;

export const resources = {
  en: { common: enCommon, auth: enAuth, landing: enLanding, admin: enAdmin },
  hi: { common: hiCommon, auth: hiAuth, landing: hiLanding, admin: hiAdmin },
  mr: { common: mrCommon, auth: mrAuth, landing: mrLanding, admin: mrAdmin },
} as const;

/** Native names, always shown in their own script. */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
};
