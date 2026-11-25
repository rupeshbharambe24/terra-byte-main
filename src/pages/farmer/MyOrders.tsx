import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { marketApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/types';

const ALL = 'all';

/** The farmer's marketplace orders, newest first. */
const MyOrders: React.FC = () => {
  const { t, i18n } = useTranslation(['market', 'common']);
  const [status, setStatus] = useState<OrderStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(0);
  const filters = {
    status: status === ALL ? undefined : [status],
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['orders', 'mine', filters],
    queryFn: () => marketApi.orders(filters),
    placeholderData: keepPreviousData,
  });
  const lng = i18n.resolvedLanguage;

  return (
    <AppShell>
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <Button variant="outline" asChild>
            <Link to="/marketplace">{t('orders.browse')}</Link>
          </Button>
        }
      />
      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as OrderStatus | typeof ALL);
            setPage(0);
          }}
        >
          <SelectTrigger aria-label={t('orders.filterStatus')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('orders.allStatuses')}</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`common:orderStatus.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={status === ALL ? t('orders.empty') : t('orders.emptyFiltered')}
          body={status === ALL ? t('orders.emptyBody') : undefined}
          action={
            status === ALL ? (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link to="/marketplace">{t('orders.browse')}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data?.items.map((o) => (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
                  <Card className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{t('orders.orderNo', { id: o.id })}</span>
                          <StatusPill kind="order" status={o.status} />
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 break-words">
                          {o.vendor_name} · {t('orders.items', { count: o.items.length })} · {t('orders.placedOn', { date: formatDate(o.created_at, lng) })}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 truncate">{o.items.map((i) => i.product_name).join(', ')}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatMoney(o.total_inr, lng)}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </AppShell>
  );
};

export default MyOrders;
