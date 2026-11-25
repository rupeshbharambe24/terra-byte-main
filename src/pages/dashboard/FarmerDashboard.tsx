import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  FlaskConical,
  IndianRupee,
  Landmark,
  MapPin,
  MessageSquare,
  Package,
  ShoppingCart,
  Tractor,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import IrrigationCard from '@/components/dashboard/IrrigationCard';
import PricesCard from '@/components/dashboard/PricesCard';
import WeatherCard from '@/components/dashboard/WeatherCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/lib/api';
import { acresToGuntha, formatDateTime, formatMoney, formatMonth, formatNumber } from '@/lib/format';

interface StatProps {
  to: string;
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}

const Stat: React.FC<StatProps> = ({ to, icon: Icon, label, value, detail }) => (
  <Link to={to} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-green-100 p-2 text-green-700 dark:bg-green-900 dark:text-green-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {detail && <p className="text-xs text-gray-500">{detail}</p>}
        </div>
      </CardContent>
    </Card>
  </Link>
);

const FarmerDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['farm', 'common']);
  const lng = i18n.resolvedLanguage;
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'farmer'], queryFn: dashboardApi.farmer });

  const links = [
    { to: '/marketplace', icon: ShoppingCart, key: 'marketplace' },
    { to: '/equipment-rentals', icon: Tractor, key: 'rentals' },
    { to: '/kvk-consultation', icon: Building2, key: 'kvk' },
    { to: '/forums', icon: MessageSquare, key: 'forums' },
    { to: '/financial-management', icon: IndianRupee, key: 'accounts' },
    { to: '/soil-fertilizer', icon: FlaskConical, key: 'soil' },
    { to: '/government-schemes', icon: Landmark, key: 'schemes' },
    { to: '/settings', icon: MapPin, key: 'fields' },
  ];

  return (
    <AppShell>
      <PageHeader
        title={t('dashboard.greeting', { name: user?.name ?? '' })}
        subtitle={t('dashboard.subtitle')}
      />
      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Stat
              to="/settings"
              icon={MapPin}
              label={t('dashboard.fields')}
              value={formatNumber(data.fields, lng)}
              detail={
                data.fields > 0
                  ? t('dashboard.fieldsArea', {
                      acres: formatNumber(data.total_acres, lng),
                      guntha: formatNumber(acresToGuntha(data.total_acres), lng, 1),
                    })
                  : t('dashboard.addField')
              }
            />
            <Stat to="/orders" icon={Package} label={t('dashboard.openOrders')} value={formatNumber(data.open_orders, lng)} />
            <Stat
              to="/equipment-rentals?tab=bookings"
              icon={Tractor}
              label={t('dashboard.upcomingBookings')}
              value={formatNumber(data.upcoming_bookings_count, lng)}
            />
            <Stat
              to="/kvk-consultation"
              icon={Building2}
              label={t('dashboard.openConsultations')}
              value={formatNumber(data.open_consultations, lng)}
            />
            <Stat
              to="/notifications"
              icon={Bell}
              label={t('dashboard.unread')}
              value={formatNumber(data.unread_notifications, lng)}
            />
            <Stat
              to="/financial-management"
              icon={IndianRupee}
              label={t('dashboard.month', { month: formatMonth(data.month, lng) })}
              value={formatMoney(data.month_expense, lng)}
              detail={t('dashboard.monthDetail', { income: formatMoney(data.month_income, lng) })}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{t('dashboard.recentOrders')}</CardTitle>
                <Link to="/orders" className="text-sm text-green-700 hover:underline dark:text-green-400">
                  {t('dashboard.viewAll')}
                </Link>
              </CardHeader>
              <CardContent>
                {data.recent_orders.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('dashboard.noOrders')}</p>
                ) : (
                  <ul className="divide-y dark:divide-gray-700">
                    {data.recent_orders.map((o) => (
                      <li key={o.id}>
                        <Link to={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 hover:underline">
                          <span className="min-w-0 text-sm text-gray-900 dark:text-gray-100">
                            {t('dashboard.orderLine', { id: o.id, vendor: o.vendor_name })}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium">{formatMoney(o.total_inr, lng)}</span>
                            <StatusPill kind="order" status={o.status} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{t('dashboard.nextBookings')}</CardTitle>
                <Link to="/equipment-rentals?tab=bookings" className="text-sm text-green-700 hover:underline dark:text-green-400">
                  {t('dashboard.viewAll')}
                </Link>
              </CardHeader>
              <CardContent>
                {data.upcoming_bookings.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('dashboard.noBookings')}</p>
                ) : (
                  <ul className="divide-y dark:divide-gray-700">
                    {data.upcoming_bookings.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span className="min-w-0 text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{b.equipment_name}</span>
                          <span className="block text-xs text-gray-500">{formatDateTime(b.start_at, lng)}</span>
                        </span>
                        <StatusPill kind="booking" status={b.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <WeatherCard />
            <IrrigationCard />
          </div>
          <PricesCard />

          <section aria-labelledby="quick-links">
            <h2 id="quick-links" className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t('dashboard.quickLinks')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {links.map(({ to, icon: Icon, key }) => (
                <Link
                  key={key}
                  to={to}
                  className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-medium text-gray-800 hover:bg-green-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Icon className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                  {t(`dashboard.links.${key}`)}
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
};

export default FarmerDashboard;
