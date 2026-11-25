import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { marketApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatMoney } from '@/lib/format';
import { vendorActions } from '@/lib/market';
import type { Order, OrderStatus } from '@/lib/types';

type VendorAction = 'accept' | 'reject' | 'ship' | 'deliver';
type Filter = 'open' | 'all' | OrderStatus;
const FILTERS: Filter[] = ['open', 'all', 'placed', 'accepted', 'shipped', 'delivered', 'rejected', 'cancelled'];
const OPEN: OrderStatus[] = ['placed', 'accepted', 'shipped'];

function statusesFor(filter: Filter): OrderStatus[] | undefined {
  if (filter === 'all') return undefined;
  if (filter === 'open') return OPEN;
  return [filter];
}

const ActionDialog: React.FC<{ order: Order; action: VendorAction; onClose: () => void }> = ({ order, action, onClose }) => {
  const { t } = useTranslation(['market', 'common']);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => marketApi.orderAction(order.id, action, action === 'reject' ? reason.trim() || undefined : undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t(`vendorOrders.done.${action}`, { id: order.id }));
      onClose();
    },
    onError: (err) => {
      toast.error(errorMessage(t, err));
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`vendorOrders.confirmTitle.${action}`, { id: order.id })}</DialogTitle>
          <DialogDescription>{t(`vendorOrders.confirmBody.${action}`, { buyer: order.buyer_name })}</DialogDescription>
        </DialogHeader>
        {action === 'reject' && (
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t('vendorOrders.reasonLabel')}</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('vendorOrders.reasonPlaceholder')}
            />
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            className={action === 'reject' ? undefined : 'bg-green-600 hover:bg-green-700 text-white'}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {t(`vendorOrders.actions.${action}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Orders placed with this vendor, with the fulfilment actions the server allows. */
const VendorOrders: React.FC = () => {
  const { t, i18n } = useTranslation(['market', 'common']);
  const [filter, setFilter] = useState<Filter>('open');
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ order: Order; action: VendorAction } | null>(null);
  const lng = i18n.resolvedLanguage;
  const query = { status: statusesFor(filter), limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['orders', 'vendor', query],
    queryFn: () => marketApi.orders(query),
    placeholderData: keepPreviousData,
  });

  return (
    <AppShell>
      <PageHeader title={t('vendorOrders.title')} subtitle={t('vendorOrders.subtitle')} />
      <div className="mb-4 max-w-xs">
        <Select
          value={filter}
          onValueChange={(v) => {
            setFilter(v as Filter);
            setPage(0);
          }}
        >
          <SelectTrigger aria-label={t('orders.filterStatus')}><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f === 'open' ? t('vendorOrders.open') : f === 'all' ? t('orders.allStatuses') : t(`common:orderStatus.${f}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data && data.items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={t('vendorOrders.empty')} body={t('vendorOrders.emptyBody')} />
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3" aria-live="polite">
            {t('vendorOrders.count', { count: data?.total ?? 0 })}
          </p>
          <ul className={`grid gap-4 xl:grid-cols-2 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {data?.items.map((o) => (
              <li key={o.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{t('orders.orderNo', { id: o.id })}</span>
                      <StatusPill kind="order" status={o.status} />
                    </div>
                    <p className="text-sm text-gray-500">{formatDateTime(o.created_at, lng)}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
                      <dt className="text-gray-500">{t('vendorOrders.buyer')}</dt>
                      <dd className="sm:col-span-2">
                        {o.buyer_name}
                        {o.buyer_phone && (
                          <a href={`tel:+91${o.buyer_phone}`} className="ml-2 inline-flex items-center gap-1 text-green-700 hover:underline dark:text-green-400">
                            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                            {o.buyer_phone}
                          </a>
                        )}
                      </dd>
                      <dt className="text-gray-500">{t('detail.address')}</dt>
                      <dd className="sm:col-span-2 whitespace-pre-line break-words">{o.delivery_address}</dd>
                      <dt className="text-gray-500">{t('detail.payment')}</dt>
                      <dd className="sm:col-span-2">{t(`payment.${o.payment_method}`)}</dd>
                      {o.note && (
                        <>
                          <dt className="text-gray-500">{t('detail.note')}</dt>
                          <dd className="sm:col-span-2 break-words">{o.note}</dd>
                        </>
                      )}
                    </dl>
                    <ul className="divide-y rounded-md border">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                          <span className="min-w-0 break-words">
                            {i.product_name}{' '}
                            <span className="text-gray-500">
                              {t('detail.qtyLine', { quantity: i.quantity, unit: i.unit, price: formatMoney(i.unit_price_inr, lng) })}
                            </span>
                          </span>
                          <span>{formatMoney(i.line_total_inr, lng)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="flex justify-between font-semibold">
                      <span>{t('detail.total')}</span>
                      <span>{formatMoney(o.total_inr, lng)}</span>
                    </p>
                    {o.status_reason && <p className="text-gray-600 dark:text-gray-400">{t('detail.reason', { reason: o.status_reason })}</p>}
                    {vendorActions(o.status).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {vendorActions(o.status).map((action) => (
                          <Button
                            key={action}
                            size="sm"
                            variant={action === 'reject' ? 'outline' : 'default'}
                            className={action === 'reject' ? undefined : 'bg-green-600 hover:bg-green-700 text-white'}
                            onClick={() => setPending({ order: o, action })}
                          >
                            {t(`vendorOrders.actions.${action}`)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
      {pending && <ActionDialog order={pending.order} action={pending.action} onClose={() => setPending(null)} />}
    </AppShell>
  );
};

export default VendorOrders;
