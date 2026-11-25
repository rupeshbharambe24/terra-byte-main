import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { missingDistricts } from '@/lib/advice';
import { adviceApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';

const REQUIRED_FIELDS = ['name', 'district', 'state'];
const OPTIONAL_FIELDS = [
  'host_organisation',
  'address',
  'pincode',
  'phone',
  'email',
  'website',
  'lat',
  'lon',
  'source_url',
  'verified_on',
];
const COMMAND = 'uv run terrabyte-import-kvk <file.json>';

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </CardContent>
  </Card>
);

/** What the KVK directory holds and the history of imports of the verified list. */
const KVKIntegration: React.FC = () => {
  const { t, i18n } = useTranslation(['advice', 'common']);
  const lng = i18n.resolvedLanguage;
  const query = useQuery({ queryKey: ['kvk-status'], queryFn: () => adviceApi.kvkStatus() });
  const s = query.data;
  const mhCovered = s ? MAHARASHTRA_DISTRICTS.length - missingDistricts(s.districts).length : 0;
  const missing = s ? missingDistricts(s.districts) : [];

  return (
    <AppShell>
      <PageHeader
        title={t('kvkStatus.title')}
        subtitle={t('kvkStatus.subtitle')}
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin-kvk-management">{t('kvkStatus.manage')}</Link>
          </Button>
        }
      />
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError || !s ? (
        <ErrorAlert error={query.error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t('kvkStatus.total')} value={String(s.total)} />
            <Stat label={t('kvkStatus.verified')} value={String(s.verified)} />
            <Stat
              label={t('kvkStatus.districts')}
              value={t('kvkStatus.districtsValue', { covered: mhCovered, total: MAHARASHTRA_DISTRICTS.length })}
            />
            <Stat
              label={t('kvkStatus.lastVerified')}
              value={s.last_verified_on ? formatDate(s.last_verified_on, lng) : t('kvkStatus.never')}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('kvkStatus.missingTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 dark:text-gray-300">
              {missing.length === 0 ? t('kvkStatus.allCovered') : missing.join(', ')}
            </CardContent>
          </Card>

          <section aria-labelledby="kvk-imports" className="space-y-3">
            <h2 id="kvk-imports" className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('kvkStatus.imports')}
            </h2>
            {s.imports.length === 0 ? (
              <EmptyState icon={FileJson} title={t('kvkStatus.noImports')} body={t('kvkStatus.noImportsBody')} />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('kvkStatus.columns.source')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('kvkStatus.columns.time')}</TableHead>
                        <TableHead>{t('kvkStatus.columns.result')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.imports.map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell className="align-top">
                            <div className="break-all font-medium">{imp.source}</div>
                            <div className="text-xs text-gray-500 sm:hidden">{formatDateTime(imp.imported_at, lng)}</div>
                          </TableCell>
                          <TableCell className="hidden align-top whitespace-nowrap sm:table-cell">
                            {formatDateTime(imp.imported_at, lng)}
                          </TableCell>
                          <TableCell className="align-top text-sm">
                            {t('kvkStatus.result', { created: imp.created, updated: imp.updated, skipped: imp.skipped })}
                            {imp.errors && imp.errors.length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-red-700 dark:text-red-400">
                                  {t('kvkStatus.showErrors', { count: imp.errors.length })}
                                </summary>
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700 dark:text-gray-300">
                                  {imp.errors.map((e, i) => (
                                    <li key={i} className="break-words">
                                      {e}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('kvkStatus.howToTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>{t('kvkStatus.howToBody')}</p>
              <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                <code>{COMMAND}</code>
              </pre>
              <p>
                <span className="font-medium">{t('kvkStatus.fieldsRequired')}: </span>
                <code className="break-words">{REQUIRED_FIELDS.join(', ')}</code>
              </p>
              <p>
                <span className="font-medium">{t('kvkStatus.fieldsOptional')}: </span>
                <code className="break-words">{OPTIONAL_FIELDS.join(', ')}</code>
              </p>
              <p>{t('kvkStatus.howToMatch')}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
};

export default KVKIntegration;
