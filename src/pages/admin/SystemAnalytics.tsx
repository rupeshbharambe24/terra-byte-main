import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import Breakdown from '@/components/dashboard/Breakdown';
import DayChart from '@/components/dashboard/DayChart';
import Section from '@/components/dashboard/Section';
import { dashboardApi } from '@/lib/api';
import { formatHours, orderedCounts } from '@/lib/dashboard';
import { formatMoney, formatNumber } from '@/lib/format';
import { BOOKING_STATUSES, CONSULTATION_STATUSES, ORDER_STATUSES, ROLES, USER_STATUSES } from '@/lib/types';

const SystemAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const units = { min: t('shared.unitMin'), h: t('shared.unitHour') };
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: dashboardApi.admin });
  const count = (n: number) => formatNumber(n, lng);

  return (
    <AppShell>
      <PageHeader title={t('system.title')} subtitle={t('system.subtitle')} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <ErrorAlert error={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('system.newUsers')} note={t('system.perDayNote')}>
              <DayChart
                series={data.new_users_last_30_days}
                metric="count"
                label={t('system.signUps')}
                emptyText={t('shared.noActivity')}
                format={count}
              />
            </Section>
            <Section title={t('system.ordersPerDay')} note={t('system.ordersPerDayNote')}>
              <DayChart
                series={data.orders_last_30_days}
                metric="count"
                label={t('system.orders')}
                emptyText={t('shared.noActivity')}
                format={count}
                color="#2563eb"
              />
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('admin.usersByRole')}>
              <Breakdown
                ariaLabel={t('admin.usersByRole')}
                emptyText={t('admin.noUsers')}
                rows={orderedCounts(data.users_by_role, ROLES).map(({ key, count: n }) => ({ key, label: t(`common:roles.${key}`), count: n }))}
              />
            </Section>
            <Section title={t('system.usersByStatus')}>
              <Breakdown
                ariaLabel={t('system.usersByStatus')}
                emptyText={t('admin.noUsers')}
                rows={orderedCounts(data.users_by_status, USER_STATUSES).map(({ key, count: n }) => ({ key, label: t(`common:status.${key}`), count: n }))}
              />
            </Section>
            <Section
              title={t('system.ordersByStatus')}
              note={t('system.deliveredValue', { value: formatMoney(data.delivered_order_value, lng) })}
            >
              <Breakdown
                ariaLabel={t('system.ordersByStatus')}
                emptyText={t('system.none')}
                rows={orderedCounts(data.orders_by_status, ORDER_STATUSES).map(({ key, count: n }) => ({ key, label: t(`common:orderStatus.${key}`), count: n }))}
              />
            </Section>
            <Section
              title={t('system.bookingsByStatus')}
              note={t('system.rentalValue', { value: formatMoney(data.completed_rental_value, lng) })}
            >
              <Breakdown
                ariaLabel={t('system.bookingsByStatus')}
                emptyText={t('system.none')}
                rows={orderedCounts(data.bookings_by_status, BOOKING_STATUSES).map(({ key, count: n }) => ({ key, label: t(`common:bookingStatus.${key}`), count: n }))}
              />
            </Section>
            <Section title={t('system.consultationsByStatus')}>
              <Breakdown
                ariaLabel={t('system.consultationsByStatus')}
                emptyText={t('system.none')}
                rows={orderedCounts(data.consultations_by_status, CONSULTATION_STATUSES).map(({ key, count: n }) => ({
                  key,
                  label: t(`common:consultationStatus.${key}`),
                  count: n,
                }))}
              />
            </Section>
            <Section title={t('system.responseTime')} note={t('system.responseTimeNote')}>
              {data.response_times.responded === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('expert.noReplies')}</p>
              ) : (
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">{t('shared.median')}</dt>
                    <dd className="text-2xl font-bold">{formatHours(data.response_times.median_hours, lng, units)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">{t('shared.average')}</dt>
                    <dd className="text-2xl font-bold">{formatHours(data.response_times.average_hours, lng, units)}</dd>
                  </div>
                  <p className="col-span-2 text-xs text-gray-500">{t('shared.basedOn', { count: data.response_times.responded })}</p>
                </dl>
              )}
            </Section>
          </div>

          <Section title={t('system.community')}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ['forumPosts', data.forum_posts],
                  ['forumReplies', data.forum_replies],
                  ['openReports', data.open_reports],
                  ['hiddenItems', data.hidden_items],
                  ['articles', data.articles_published],
                  ['kvks', data.kvks],
                  ['products', data.products_active],
                  ['equipment', data.equipment_active],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">{t(`system.counts.${key}`)}</dt>
                  <dd className="text-xl font-bold tabular-nums">{count(value)}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <p className="text-xs text-gray-500 dark:text-gray-400">{t('system.definitions')}</p>
        </div>
      )}
    </AppShell>
  );
};

export default SystemAnalytics;
