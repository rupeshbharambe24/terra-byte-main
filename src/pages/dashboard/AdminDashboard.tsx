import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Flag, MessageSquare, Package, ShieldCheck, ShoppingCart, Tractor, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import Breakdown from '@/components/dashboard/Breakdown';
import Section from '@/components/dashboard/Section';
import StatCard from '@/components/dashboard/StatCard';
import { dashboardApi } from '@/lib/api';
import { orderedCounts, sumCounts } from '@/lib/dashboard';
import { formatMoney } from '@/lib/format';
import { ROLES } from '@/lib/types';

const ADMIN_LINKS: [string, string][] = [
  ['/admin-users', 'common:sidebar.userManagement'],
  ['/admin-vendor-approvals', 'common:sidebar.vendorApprovals'],
  ['/admin-analytics', 'common:sidebar.systemAnalytics'],
  ['/admin-content', 'common:sidebar.contentModeration'],
  ['/admin-consultations', 'common:sidebar.adminConsultations'],
  ['/admin-kvk-management', 'common:sidebar.kvkManagement'],
  ['/admin-kvk-integration', 'common:sidebar.kvkIntegration'],
  ['/admin-ai-performance', 'common:sidebar.aiModelPerformance'],
  ['/forums', 'common:sidebar.forums'],
  ['/notifications', 'common:sidebar.notifications'],
];

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: dashboardApi.admin });

  return (
    <AppShell>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <ErrorAlert error={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label={t('admin.users')} value={sumCounts(data.users_by_role)} to="/admin-users" />
            <StatCard
              icon={ShieldCheck}
              label={t('admin.pendingApprovals')}
              value={data.pending_approvals}
              to="/admin-vendor-approvals"
            />
            <StatCard icon={Flag} label={t('admin.openReports')} value={data.open_reports} to="/admin-content" />
            <StatCard icon={Building2} label={t('admin.kvks')} value={data.kvks} hint={t('admin.kvksHint')} to="/admin-kvk-management" />
            <StatCard
              icon={ShoppingCart}
              label={t('admin.orders')}
              value={sumCounts(data.orders_by_status)}
              hint={t('admin.deliveredValue', { value: formatMoney(data.delivered_order_value, lng) })}
            />
            <StatCard
              icon={Tractor}
              label={t('admin.bookings')}
              value={sumCounts(data.bookings_by_status)}
              hint={t('admin.rentalValue', { value: formatMoney(data.completed_rental_value, lng) })}
            />
            <StatCard
              icon={MessageSquare}
              label={t('admin.consultations')}
              value={sumCounts(data.consultations_by_status)}
              hint={t('admin.unanswered', { count: (data.consultations_by_status.open ?? 0) + (data.consultations_by_status.assigned ?? 0) })}
              to="/admin-consultations"
            />
            <StatCard
              icon={Package}
              label={t('admin.listings')}
              value={`${data.products_active} / ${data.equipment_active}`}
              hint={t('admin.listingsHint')}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('admin.usersByRole')} link={{ to: '/admin-analytics', label: t('common:sidebar.systemAnalytics') }}>
              <Breakdown
                ariaLabel={t('admin.usersByRole')}
                emptyText={t('admin.noUsers')}
                rows={orderedCounts(data.users_by_role, ROLES).map(({ key, count }) => ({
                  key,
                  label: t(`common:roles.${key}`),
                  count,
                }))}
              />
            </Section>
            <Section title={t('shared.quickLinks')}>
              <div className="flex flex-wrap gap-2">
                {ADMIN_LINKS.map(([to, key]) => (
                  <Link key={to} to={to} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    {t(key)}
                  </Link>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default AdminDashboard;
