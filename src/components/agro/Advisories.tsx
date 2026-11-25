import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/lib/format';
import type { Advisory } from '@/lib/agro';

/** Rule-based farm advisories; each shows the rule that triggered it. */
const Advisories: React.FC<{ items: Advisory[]; compact?: boolean }> = ({ items, compact }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  if (items.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">{t('weather.noAdvisories')}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const Icon = a.severity === 'warning' ? AlertTriangle : Info;
        const values = {
          mm: formatNumber(Number(a.values.mm ?? 0), lng, 1),
          kmh: formatNumber(Number(a.values.kmh ?? 0), lng, 0),
          c: formatNumber(Number(a.values.c ?? 0), lng, 1),
          date: a.values.date ? formatDate(String(a.values.date), lng) : '',
        };
        return (
          <li
            key={a.id}
            className={`flex gap-2 rounded-lg border p-3 text-sm ${
              a.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'
                : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100'
            }`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium">{t(`weather.advisories.${a.id}`, values)}</p>
              {!compact && (
                <p className="mt-1 text-xs opacity-80">
                  {t('weather.ruleLabel')}: {t(`weather.rules.${a.id}`)}
                  {a.source_url && (
                    <>
                      {' · '}
                      <a href={a.source_url} target="_blank" rel="noreferrer noopener" className="underline">
                        {t('common.source')}
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default Advisories;
