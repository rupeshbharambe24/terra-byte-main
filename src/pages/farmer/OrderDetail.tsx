import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { marketApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatMoney } from '@/lib/format';
import { canBuyerCancel, orderTimeline } from '@/lib/market';
import type { Order } from '@/lib/types';

const Timeline: React.FC<{ order: Order }> = ({ order }) => {
  const { t, i18n } = useTranslation(['market']);
  const steps = orderTimeline(order);
  return (
    <ol className="space-y-4" aria-label={t('detail.timeline')}>
      {steps.map((s) => {
        const negative = s.step === 'cancelled' || s.step === 'rejected';
        const Icon = !s.done ? Circle : negative ? XCircle : CheckCircle2;
        return (
          <li key={s.step} className="flex gap-3">
            <Icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${!s.done ? 'text-gray-300' : negative ? 'text-red-600' : 'text-green-600'}`}
              aria-hidden="true"
            />
            <div>
              <p className={`font-medium ${s.done ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{t(`timeline.${s.step}`)}</p>
              <p className="text-sm text-gray-500">{s.at ? formatDateTime(s.at, i18n.resolvedLanguage) : t('detail.pending')}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/** One order with its items, server totals and real status history. */
const OrderDetail: React.FC = () => {
  const { orderId } = useParams();
  const id = Number(orderId);
  const { t, i18n } = useTranslation(['market', 'common']);
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const lng = i18n.resolvedLanguage;

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => marketApi.order(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  const cancel = useMutation({
    mutationFn: () => marketApi.orderAction(id, 'cancel', reason.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(['orders', 'detail', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setCancelOpen(false);
      setReason('');
      toast.success(t('detail.cancelled'));
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const back = (
    <Button variant="outline" asChild>
      <Link to="/orders">
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        {t('detail.back')}
      </Link>
    </Button>
  );

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <AppShell>
        <PageHeader title={t('detail.notFound')} actions={back} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {isLoading ? (
        <PageSpinner />
      ) : isError || !order ? (
        <>
          <PageHeader title={t('detail.title', { id })} actions={back} />
          <ErrorAlert error={error} />
        </>
      ) : (
        <>
          <PageHeader
            title={t('detail.title', { id: order.id })}
            subtitle={t('detail.from', { vendor: order.vendor_name })}
            actions={
              <>
                {back}
                {canBuyerCancel(order.status) && (
                  <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                    {t('detail.cancel')}
                  </Button>
                )}
              </>
            }
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{t('detail.items')}</CardTitle>
                    <StatusPill kind="order" status={order.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium break-words">{item.product_name}</p>
                          <p className="text-gray-500">
                            {t('detail.qtyLine', { quantity: item.quantity, unit: item.unit, price: formatMoney(item.unit_price_inr, lng) })}
                          </p>
                        </div>
                        <p className="font-medium">{formatMoney(item.line_total_inr, lng)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between border-t pt-3 font-semibold">
                    <span>{t('detail.total')}</span>
                    <span>{formatMoney(order.total_inr, lng)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                    <dt className="text-gray-500">{t('detail.vendor')}</dt>
                    <dd className="sm:col-span-2">{order.vendor_name}</dd>
                    <dt className="text-gray-500">{t('detail.address')}</dt>
                    <dd className="sm:col-span-2 whitespace-pre-line break-words">{order.delivery_address}</dd>
                    <dt className="text-gray-500">{t('detail.payment')}</dt>
                    <dd className="sm:col-span-2">{t(`payment.${order.payment_method}`)}</dd>
                    {order.note && (
                      <>
                        <dt className="text-gray-500">{t('detail.note')}</dt>
                        <dd className="sm:col-span-2 break-words">{order.note}</dd>
                      </>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('detail.timeline')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Timeline order={order} />
                {order.status_reason && (
                  <p className="rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800">{t('detail.reason', { reason: order.status_reason })}</p>
                )}
                {order.status === 'delivered' && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('detail.addedToAccounts')}{' '}
                    <Link to="/financial-management" className="text-green-700 underline dark:text-green-400">
                      {t('detail.openAccounts')}
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog open={cancelOpen} onOpenChange={(o) => !cancel.isPending && setCancelOpen(o)}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('detail.cancelTitle', { id: order.id })}</DialogTitle>
                <DialogDescription>{t('detail.cancelBody')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">{t('detail.reasonLabel')}</Label>
                <Textarea id="cancel-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancel.isPending}>
                  {t('detail.keep')}
                </Button>
                <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                  {t('detail.cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AppShell>
  );
};

export default OrderDetail;
