import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import type { SourceRef } from '@/lib/agro';

/** "Source: … · Last verified …" line shown under every number taken from reference data. */
export const SourceNote: React.FC<{ sources: SourceRef[]; lastVerified?: string | null; className?: string }> = ({
  sources,
  lastVerified,
  className,
}) => {
  const { t, i18n } = useTranslation('agro');
  const unique = sources.filter((s, i) => s.name && sources.findIndex((o) => o.name === s.name) === i);
  return (
    <div className={`text-xs text-gray-600 dark:text-gray-400 ${className ?? ''}`}>
      <span className="font-medium">{t('common.sources')}: </span>
      {unique.map((s, i) => (
        <span key={s.name}>
          {i > 0 && '; '}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline break-words">
              {s.name}
            </a>
          ) : (
            s.name
          )}
          {s.locator ? ` (${s.locator})` : ''}
        </span>
      ))}
      {lastVerified && (
        <span className="block">{t('common.lastVerified', { date: formatDate(lastVerified, i18n.resolvedLanguage) })}</span>
      )}
    </div>
  );
};

/** Inline external link with an icon. */
export const ExtLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className="inline-flex items-center gap-1 text-green-700 hover:underline dark:text-green-400"
  >
    {children}
    <ExternalLink className="h-3 w-3" aria-hidden="true" />
  </a>
);

/** Yellow box for assumptions, flags and the "follow your officer" disclaimer. */
export const Caution: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    role="note"
    className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
  >
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  </div>
);

/** Open-Meteo CC BY 4.0 attribution (required wherever its data is shown). */
export const WeatherAttribution: React.FC = () => {
  const { t } = useTranslation('agro');
  return (
    <p className="text-xs text-gray-500">
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer noopener" className="underline">
        {t('weather.attribution')}
      </a>{' '}
      (
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener" className="underline">
        CC BY 4.0
      </a>
      )
    </p>
  );
};
