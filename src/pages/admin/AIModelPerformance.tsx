import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboardApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { formatDateTime, formatNumber } from '@/lib/format';

/** Held-out evaluation results stored by our evaluation scripts. Nothing else is shown. */
const AIModelPerformance: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const [page, setPage] = useState(0);
  const query = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'model-evaluations', query],
    queryFn: () => dashboardApi.modelEvaluations(query),
    placeholderData: keepPreviousData,
  });

  return (
    <AppShell>
      <PageHeader title={t('models.title')} subtitle={t('models.subtitle')} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <ErrorAlert error={error} />
      ) : data.total === 0 ? (
        <EmptyState icon={FlaskConical} title={t('models.emptyTitle')} body={t('models.emptyBody')} />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('models.model')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('models.dataset')}</TableHead>
                    <TableHead>{t('models.metric')}</TableHead>
                    <TableHead className="text-right">{t('models.value')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('models.evaluatedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.model_name}</div>
                        <div className="text-xs text-gray-500">{t('models.version', { version: row.version })}</div>
                        {row.details && (
                          <details className="mt-1 text-xs">
                            <summary className="cursor-pointer text-green-700 dark:text-green-400">{t('models.details')}</summary>
                            <pre className="mt-1 max-w-[16rem] overflow-x-auto whitespace-pre-wrap break-words sm:max-w-md">
                              {JSON.stringify(row.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell break-words">{row.dataset}</TableCell>
                      <TableCell>{row.metric_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.value, lng, 4)}</TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDateTime(row.evaluated_at, lng)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </AppShell>
  );
};

export default AIModelPerformance;
