import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock, IndianRupee, Tractor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import Breakdown from '@/components/dashboard/Breakdown';
import DayChart from '@/components/dashboard/DayChart';
import Section from '@/components/dashboard/Section';
import StatCard from '@/components/dashboard/StatCard';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/lib/api';
import { formatPercent, orderedCounts } from '@/lib/dashboard';
import { formatDateTime, formatMoney, formatMonth, formatNumber } from '@/lib/format';
import { BOOKING_STATUSES } from '@/lib/types';

const HardwareVendorDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'hardware'], queryFn: dashboardApi.hardware });

  return (
    <AppShell>
      <PageHeader title={t('hardware.title')} subtitle={user ? t('shared.welcome', { name: user.name }) : undefined} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <ErrorAlert error={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Tractor}
              label={t('hardware.activeMachines')}
              value={`${data.equipment_active} / ${data.equipment_total}`}
              to="/hardware-equipment"
            />
            <StatCard
              icon={Clock}
              label={t('hardware.pendingRequests')}
              value={data.pending_requests}
              hint={t('hardware.pendingHint')}
              to="/hardware-rentals"
            />
            <StatCard
              icon={IndianRupee}
              label={t('hardware.revenueMonth', { month: formatMonth(data.month, lng) })}
              value={formatMoney(data.revenue_this_month, lng)}
              hint={t('hardware.completedOnly')}
            />
            <StatCard
              icon={BarChart3}
              label={t('hardware.revenueTotal')}
              value={formatMoney(data.revenue_total, lng)}
              hint={t('hardware.completedOnly')}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title={t('hardware.upcoming')}
              link={{ to: '/hardware-calendar', label: t('common:sidebar.calendar') }}
            >
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('hardware.noUpcoming')}</p>
              ) : (
                <ul className="divide-y dark:divide-gray-700">
                  {data.upcoming.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <Link to="/hardware-rentals" className="font-medium text-gray-900 hover:underline dark:text-gray-100">
                          {b.equipment_name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {b.farmer_name} · {formatDateTime(b.start_at, lng)} · {formatMoney(b.amount_inr, lng)}
                        </p>
                      </div>
                      <StatusPill kind="booking" status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t('hardware.bookingsByStatus')}>
              <Breakdown
                ariaLabel={t('hardware.bookingsByStatus')}
                emptyText={t('hardware.noBookings')}
                rows={orderedCounts(data.bookings_by_status, BOOKING_STATUSES).map(({ key, count }) => ({
                  key,
                  label: t(`common:bookingStatus.${key}`),
                  count,
                }))}
              />
            </Section>
          </div>

          <Section title={t('hardware.utilisation')} note={t('hardware.utilisationNote')}>
            {data.utilisation.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('hardware.noMachines')}</p>
            ) : (
              <>
                <p className="mb-3 text-sm">
                  {t('hardware.overall')}:{' '}
                  <strong className="tabular-nums">{formatPercent(data.utilisation_overall, lng)}</strong>
                </p>
                <ul className="space-y-3">
                  {data.utilisation.map((u) => (
                    <li key={u.equipment_id} className="text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="min-w-0 truncate">{u.name}</span>
                        <span className="tabular-nums text-gray-600 dark:text-gray-300">
                          {t('hardware.bookedDays', { booked: u.booked_days, days: u.days })} · {formatPercent(u.share, lng)}
                        </span>
                      </div>
                      <div
                        className="mt-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700"
                        role="progressbar"
                        aria-label={u.name}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(u.share * 100)}
                      >
                        <div className="h-2.5 rounded-full bg-green-600 dark:bg-green-500" style={{ width: `${u.share * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section title={t('hardware.requestsPerDay')} note={t('hardware.requestsPerDayNote')}>
            <DayChart
              series={data.requests_last_30_days}
              metric="count"
              label={t('hardware.requests')}
              emptyText={t('shared.noActivity')}
              format={(n) => formatNumber(n, lng)}
            />
          </Section>
        </div>
      )}
    </AppShell>
  );
};

export default HardwareVendorDashboard;
