import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, IndianRupee, Package, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import Breakdown from '@/components/dashboard/Breakdown';
import Section from '@/components/dashboard/Section';
import StatCard from '@/components/dashboard/StatCard';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/lib/api';
import { orderedCounts } from '@/lib/dashboard';
import { formatDate, formatMoney, formatMonth } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/types';

const VendorDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'vendor'], queryFn: dashboardApi.vendor });

  return (
    <AppShell>
      <PageHeader title={t('vendor.title')} subtitle={user ? t('shared.welcome', { name: user.name }) : undefined} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <ErrorAlert error={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Package}
              label={t('vendor.activeProducts')}
              value={`${data.products_active} / ${data.products_total}`}
              hint={t('vendor.outOfStock', { count: data.out_of_stock })}
              to="/vendor-products"
            />
            <StatCard icon={ShoppingCart} label={t('vendor.openOrders')} value={data.open_orders} hint={t('vendor.openOrdersHint')} to="/vendor-orders" />
            <StatCard
              icon={IndianRupee}
              label={t('vendor.revenueMonth', { month: formatMonth(data.month, lng) })}
              value={formatMoney(data.revenue_this_month, lng)}
              hint={t('vendor.deliveredOnly')}
            />
            <StatCard
              icon={BarChart3}
              label={t('vendor.revenueTotal')}
              value={formatMoney(data.revenue_total, lng)}
              hint={t('vendor.deliveredOnly')}
              to="/vendor-analytics"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('vendor.recentOrders')} link={{ to: '/vendor-orders', label: t('shared.viewAll') }}>
              {data.recent_orders.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('vendor.noOrders')}</p>
              ) : (
                <ul className="divide-y dark:divide-gray-700">
                  {data.recent_orders.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <Link to="/vendor-orders" className="font-medium text-gray-900 hover:underline dark:text-gray-100">
                          {t('shared.orderNo', { id: o.id })} · {o.buyer_name}
                        </Link>
                        <p className="text-xs text-gray-500">{formatDate(o.created_at, lng)} · {formatMoney(o.total_inr, lng)}</p>
                      </div>
                      <StatusPill kind="order" status={o.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t('vendor.ordersByStatus')}>
              <Breakdown
                ariaLabel={t('vendor.ordersByStatus')}
                emptyText={t('vendor.noOrders')}
                rows={orderedCounts(data.orders_by_status, ORDER_STATUSES).map(({ key, count }) => ({
                  key,
                  label: t(`common:orderStatus.${key}`),
                  count,
                }))}
              />
            </Section>
          </div>

          <Section
            title={t('vendor.lowStock')}
            note={t('vendor.lowStockNote')}
            link={{ to: '/vendor-products', label: t('vendor.manageProducts') }}
          >
            {data.low_stock.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('vendor.noLowStock')}</p>
            ) : (
              <ul className="divide-y dark:divide-gray-700">
                {data.low_stock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {p.stock === 0 && <AlertTriangle className="mr-1 inline h-4 w-4 text-red-600" aria-hidden="true" />}
                      {p.name} <span className="text-gray-500">({p.unit})</span>
                    </span>
                    <span className={p.stock === 0 ? 'font-medium text-red-600' : 'font-medium'}>
                      {p.stock === 0 ? t('vendor.soldOut') : t('vendor.left', { count: p.stock })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('shared.quickLinks')}>
            <div className="flex flex-wrap gap-2">
              {[
                ['/vendor-products', 'common:sidebar.products'],
                ['/vendor-orders', 'common:sidebar.orders'],
                ['/vendor-analytics', 'common:sidebar.analytics'],
                ['/marketplace', 'common:sidebar.marketplace'],
                ['/notifications', 'common:sidebar.notifications'],
              ].map(([to, key]) => (
                <Link key={to} to={to} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  {t(key)}
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}
    </AppShell>
  );
};

export default VendorDashboard;
