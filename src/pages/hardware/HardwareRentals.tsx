import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import BookingActionDialog from '@/components/rentals/BookingActionDialog';
import { BookingSummary } from '@/components/rentals/RentalBits';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rentalsApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { canComplete } from '@/lib/rentals';
import { BOOKING_STATUSES, type Booking, type BookingStatus } from '@/lib/types';

const ALL = 'all';

const Actions: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { t } = useTranslation('rentals');
  if (b.status === 'requested') {
    return (
      <div className="flex flex-wrap gap-2">
        <BookingActionDialog
          booking={b}
          action="accept"
          variant="default"
          label={t('owner.accept')}
          title={t('owner.acceptTitle', { id: b.id })}
          body={t('owner.acceptBody')}
          doneMessage={t('owner.accepted')}
        />
        <BookingActionDialog
          booking={b}
          action="reject"
          withReason
          label={t('owner.reject')}
          title={t('owner.rejectTitle', { id: b.id })}
          body={t('owner.rejectBody')}
          doneMessage={t('owner.rejected')}
        />
      </div>
    );
  }
  if (b.status === 'accepted') {
    const ready = canComplete(b);
    return (
      <div className="space-y-1">
        <BookingActionDialog
          booking={b}
          action="complete"
          variant="default"
          disabled={!ready}
          label={t('owner.complete')}
          title={t('owner.completeTitle', { id: b.id })}
          body={t('owner.completeBody')}
          doneMessage={t('owner.completed')}
        />
        {!ready && <p className="text-xs text-gray-500">{t('owner.completeLater')}</p>}
      </div>
    );
  }
  return null;
};

const HardwareRentals: React.FC = () => {
  const { t } = useTranslation(['rentals', 'common']);
  const [status, setStatus] = useState<BookingStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(0);
  const filters = {
    status: status === ALL ? undefined : [status],
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['bookings', 'owner', filters],
    queryFn: () => rentalsApi.bookings(filters),
    placeholderData: keepPreviousData,
  });

  return (
    <AppShell>
      <PageHeader title={t('owner.title')} subtitle={t('owner.subtitle')} />
      <div className="mb-4 sm:w-64">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as BookingStatus | typeof ALL);
            setPage(0);
          }}
        >
          <SelectTrigger aria-label={t('filters.status')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filters.allStatuses')}</SelectItem>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`common:bookingStatus.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('owner.empty')} body={t('owner.emptyBody')} />
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('owner.count', { count: data.total })}
          </p>
          <div className={`grid gap-4 lg:grid-cols-2 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {data.items.map((b) => (
              <Card key={b.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{t('booking.number', { id: b.id })}</p>
                      <h3 className="font-semibold break-words">{b.equipment_name}</h3>
                    </div>
                    <StatusPill kind="booking" status={b.status} />
                  </div>
                  <BookingSummary booking={b} showFarmer />
                  <Actions booking={b} />
                </CardContent>
              </Card>
            ))}
          </div>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </AppShell>
  );
};

export default HardwareRentals;
