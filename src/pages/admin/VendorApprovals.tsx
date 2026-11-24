import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageSpinner from '@/components/common/PageSpinner';
import { RoleBadge } from '@/components/admin/badges';
import StatusActionButton from '@/components/admin/StatusActionButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatLocation } from '@/lib/format';

/** Every account waiting for approval (vendors, equipment rental vendors and experts). */
const VendorApprovals: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const filters = { status: 'pending' as const, limit: 200 };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: ({ signal }) => adminApi.listUsers(filters, signal),
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('approvals.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('approvals.subtitle')}</p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
          {errorMessage(t, error)}
        </div>
      ) : data && data.items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600 dark:text-gray-300">{t('approvals.empty')}</CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3" aria-live="polite">
            {t('approvals.count', { count: data?.total ?? 0 })}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {data?.items.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-lg">{u.name}</CardTitle>
                    <RoleBadge role={u.role} />
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    {u.organization && (
                      <>
                        <dt className="text-gray-500">{t('approvals.organization')}</dt>
                        <dd className="sm:col-span-2 text-gray-900 dark:text-gray-100">{u.organization}</dd>
                      </>
                    )}
                    {u.qualifications && (
                      <>
                        <dt className="text-gray-500">{t('approvals.qualifications')}</dt>
                        <dd className="sm:col-span-2 text-gray-900 dark:text-gray-100 whitespace-pre-line">{u.qualifications}</dd>
                      </>
                    )}
                    <dt className="text-gray-500">{t('approvals.contact')}</dt>
                    <dd className="sm:col-span-2 text-gray-900 dark:text-gray-100 break-words">
                      {u.phone}{u.email ? ` · ${u.email}` : ''}
                    </dd>
                    <dt className="text-gray-500">{t('approvals.location')}</dt>
                    <dd className="sm:col-span-2 text-gray-900 dark:text-gray-100">{formatLocation([u.village, u.district, u.state])}</dd>
                    <dt className="text-gray-500">{t('approvals.registered')}</dt>
                    <dd className="sm:col-span-2 text-gray-900 dark:text-gray-100">{formatDate(u.created_at, i18n.resolvedLanguage)}</dd>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <StatusActionButton user={u} action="approve" size="default" />
                    <StatusActionButton user={u} action="reject" size="default" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
};

export default VendorApprovals;
