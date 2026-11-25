import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import Breakdown from '@/components/dashboard/Breakdown';
import DayChart from '@/components/dashboard/DayChart';
import Section from '@/components/dashboard/Section';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboardApi } from '@/lib/api';
import { orderedCounts } from '@/lib/dashboard';
import { formatMoney, formatNumber } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/types';

const VendorAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'vendor'], queryFn: dashboardApi.vendor });
  const money = (n: number) => formatMoney(n, lng);
  const count = (n: number) => formatNumber(n, lng);

  return (
    <AppShell>
      <PageHeader title={t('vendorAnalytics.title')} subtitle={t('vendorAnalytics.subtitle')} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <ErrorAlert error={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('vendorAnalytics.ordersPerDay')} note={t('vendorAnalytics.ordersPerDayNote')}>
              <DayChart
                series={data.orders_last_30_days}
                metric="count"
                label={t('vendorAnalytics.orders')}
                emptyText={t('shared.noActivity')}
                format={count}
              />
            </Section>
            <Section title={t('vendorAnalytics.valuePerDay')} note={t('vendorAnalytics.valuePerDayNote')}>
              <DayChart
                series={data.orders_last_30_days}
                metric="value"
                label={t('vendorAnalytics.orderValue')}
                emptyText={t('shared.noActivity')}
                format={money}
                color="#2563eb"
              />
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('vendor.ordersByStatus')} note={t('vendorAnalytics.allTime')}>
              <Breakdown
                ariaLabel={t('vendor.ordersByStatus')}
                emptyText={t('vendor.noOrders')}
                rows={orderedCounts(data.orders_by_status, ORDER_STATUSES).map(({ key, count: n }) => ({
                  key,
                  label: t(`common:orderStatus.${key}`),
                  count: n,
                }))}
              />
            </Section>

            <Section title={t('vendorAnalytics.topProducts')} note={t('vendorAnalytics.topProductsNote')}>
              {data.top_products.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('vendorAnalytics.noDelivered')}</p>
              ) : (
                <>
                  <div
                    className="h-48 w-full text-gray-500 dark:text-gray-400"
                    role="img"
                    aria-label={t('vendorAnalytics.topProducts')}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.top_products} layout="vertical" margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} horizontal={false} />
                        <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 11 }} tickFormatter={money} />
                        <YAxis type="category" dataKey="name" width={96} tick={{ fill: 'currentColor', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [money(v), t('vendorAnalytics.revenue')]} contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="revenue" fill="#16a34a" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('vendorAnalytics.product')}</TableHead>
                        <TableHead className="text-right">{t('vendorAnalytics.quantity')}</TableHead>
                        <TableHead className="text-right">{t('vendorAnalytics.revenue')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top_products.map((p) => (
                        <TableRow key={p.name}>
                          <TableCell className="break-words">{p.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{count(p.quantity)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Section>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">{t('vendorAnalytics.definitions')}</p>
        </div>
      )}
    </AppShell>
  );
};

export default VendorAnalytics;
