import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { LANGUAGES, LANGUAGE_NAMES, type AppLanguage } from '@/i18n/resources';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

/** Changes the UI language; saved in localStorage and, when signed in, on the user's profile. */
const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const current = (LANGUAGES as readonly string[]).includes(i18n.resolvedLanguage ?? '')
    ? (i18n.resolvedLanguage as AppLanguage)
    : 'en';

  return (
    <Select value={current} onValueChange={(lng) => void setLanguage(lng as AppLanguage)}>
      <SelectTrigger
        className="h-9 w-auto gap-1.5 px-2 sm:px-3 border-gray-200 dark:border-gray-700"
        aria-label={t('language.label')}
        title={t('language.label')}
      >
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-sm" lang={current}>{LANGUAGE_NAMES[current]}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {LANGUAGES.map((lng) => (
          <SelectItem key={lng} value={lng} lang={lng}>
            {LANGUAGE_NAMES[lng]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
