import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Search, Tractor, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import BookingActionDialog from '@/components/rentals/BookingActionDialog';
import { BookingSummary, RateLine } from '@/components/rentals/RentalBits';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fileUrl, rentalsApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS, PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatMoney, todayIST } from '@/lib/format';
import {
  addDays,
  buildPeriod,
  canCancel,
  estimateAmount,
  MAX_DAYS,
  MAX_HOURS,
  offeredUnits,
  toIstIso,
} from '@/lib/rentals';
import { EQUIPMENT_TYPES, type Equipment, type RentalUnit } from '@/lib/types';

const ALL = 'all';
const BUSY_DAYS = 28;

const BookDialog: React.FC<{ equipment: Equipment; open: boolean; onOpenChange: (o: boolean) => void }> = ({
  equipment,
  open,
  onOpenChange,
}) => {
  const { t, i18n } = useTranslation(['rentals', 'common']);
  const lng = i18n.resolvedLanguage;
  const queryClient = useQueryClient();
  const units = offeredUnits(equipment);
  const [unit, setUnit] = useState<RentalUnit>(units[0] ?? 'day');
  const [date, setDate] = useState(() => addDays(todayIST(), 1));
  const [time, setTime] = useState('08:00');
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');
  const n = Number(count);
  const period = buildPeriod({ unit, date, time, count: n });
  const estimate = period ? estimateAmount(equipment, unit, n) : null;
  const today = todayIST();

  const window = useMemo(() => {
    const now = Date.now();
    return { from: toIstIso(now), to: toIstIso(now + BUSY_DAYS * 24 * 3600 * 1000) };
  }, []);
  const busy = useQuery({
    queryKey: ['equipment', equipment.id, 'busy', window],
    queryFn: () => rentalsApi.busy(equipment.id, window.from, window.to),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!period) throw new Error('invalid period');
      return rentalsApi.book({ equipment_id: equipment.id, unit, ...period, note: note.trim() || null });
    },
    onSuccess: () => {
      toast.success(t('book.done'));
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['equipment', equipment.id, 'busy'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('book.title', { name: equipment.name })}</DialogTitle>
          <DialogDescription>{t('book.subtitle', { owner: equipment.owner_name })}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (period) mutation.mutate();
          }}
        >
          {units.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="book-unit">{t('book.unit')}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as RentalUnit)}>
                <SelectTrigger id="book-unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>{t(`book.unitOption.${u}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="book-date">{unit === 'hour' ? t('book.date') : t('book.startDate')}</Label>
              <Input id="book-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            {unit === 'hour' && (
              <div className="space-y-2">
                <Label htmlFor="book-time">{t('book.startTime')}</Label>
                <Input id="book-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="book-count">{unit === 'hour' ? t('book.hours') : t('book.days')}</Label>
              <Input
                id="book-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={unit === 'hour' ? MAX_HOURS : MAX_DAYS}
                step={1}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
              />
            </div>
          </div>
          {unit === 'day' && <p className="text-xs text-gray-500">{t('book.dayHint')}</p>}
          <div className="space-y-2">
            <Label htmlFor="book-note">{t('book.note')}</Label>
            <Textarea id="book-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            {period && estimate !== null ? (
              <>
                <p>
                  {t('book.estimate')}: <strong>{formatMoney(estimate, lng)}</strong>
                </p>
                <p className="mt-1 text-xs text-gray-500">{t('book.estimateHint')}</p>
              </>
            ) : (
              <p className="text-amber-700 dark:text-amber-300">{t('book.invalid', { hours: MAX_HOURS, days: MAX_DAYS })}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('book.paymentHint')}</p>
          </div>

          <div>
            <p className="text-sm font-medium">{t('book.busyTitle', { days: BUSY_DAYS })}</p>
            {busy.isLoading ? (
              <p className="text-sm text-gray-500">{t('common:loading')}</p>
            ) : busy.isError ? (
              <ErrorAlert error={busy.error} className="mt-2" />
            ) : busy.data && busy.data.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {busy.data.map((slot) => (
                  <li key={`${slot.start_at}-${slot.end_at}`} className="flex flex-wrap items-center gap-2">
                    <StatusPill kind="booking" status={slot.status} />
                    <span>
                      {t('period', { start: formatDateTime(slot.start_at, lng), end: formatDateTime(slot.end_at, lng) })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-gray-500">{t('book.busyNone', { days: BUSY_DAYS })}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={!period || mutation.isPending}>
              {mutation.isPending ? t('common:actions.saving') : t('book.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EquipmentCard: React.FC<{ equipment: Equipment; onBook: () => void }> = ({ equipment, onBook }) => {
  const { t } = useTranslation('rentals');
  const src = fileUrl(equipment.image_path);
  return (
    <Card className="flex flex-col overflow-hidden">
      {src ? (
        <img src={src} alt={equipment.name} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-green-50 dark:bg-gray-800" aria-hidden="true">
          <Tractor className="h-12 w-12 text-green-600" />
        </div>
      )}
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t(`types.${equipment.type}`)}</p>
        <h3 className="font-semibold text-gray-900 dark:text-white break-words">{equipment.name}</h3>
        <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <UserIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {equipment.owner_name}
        </p>
        {equipment.district && (
          <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {equipment.district}
          </p>
        )}
        {equipment.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{equipment.description}</p>}
        <RateLine equipment={equipment} />
        <Button className="mt-auto bg-green-600 hover:bg-green-700 text-white" onClick={onBook}>
          {t('find.book')}
        </Button>
      </CardContent>
    </Card>
  );
};

const FindEquipment: React.FC = () => {
  const { t } = useTranslation(['rentals', 'common']);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>(ALL);
  const [district, setDistrict] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [booking, setBooking] = useState<Equipment | null>(null);
  const q = useDebouncedValue(search.trim(), 300);
  const filters = {
    q: q || undefined,
    type: type === ALL ? undefined : type,
    district: district === ALL ? undefined : district,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['equipment', 'catalogue', filters],
    queryFn: () => rentalsApi.equipment(filters),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            className="pl-10"
            aria-label={t('filters.search')}
            placeholder={t('filters.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-[26rem]">
          <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
            <SelectTrigger aria-label={t('filters.type')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.allTypes')}</SelectItem>
              {EQUIPMENT_TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>{t(`types.${ty}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={district} onValueChange={(v) => { setDistrict(v); setPage(0); }}>
            <SelectTrigger aria-label={t('filters.district')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.allDistricts')}</SelectItem>
              {MAHARASHTRA_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={Tractor} title={t('find.empty')} body={t('find.emptyBody')} />
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('find.count', { count: data.total })}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((eq) => (
              <EquipmentCard key={eq.id} equipment={eq} onBook={() => setBooking(eq)} />
            ))}
          </div>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
      {booking && (
        <BookDialog
          key={booking.id}
          equipment={booking}
          open
          onOpenChange={(o) => {
            if (!o) setBooking(null);
          }}
        />
      )}
    </>
  );
};

const MyBookings: React.FC = () => {
  const { t } = useTranslation(['rentals', 'common']);
  const [page, setPage] = useState(0);
  const filters = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['bookings', 'mine', filters],
    queryFn: () => rentalsApi.bookings(filters),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <PageSpinner />;
  if (isError) return <ErrorAlert error={error} />;
  if (!data || data.items.length === 0) return <EmptyState title={t('mine.empty')} body={t('mine.emptyBody')} />;
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
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
              <BookingSummary booking={b} />
              {canCancel(b) && (
                <BookingActionDialog
                  booking={b}
                  action="cancel"
                  variant="destructive"
                  withReason
                  label={t('mine.cancel')}
                  title={t('mine.cancelTitle', { id: b.id })}
                  body={t('mine.cancelBody')}
                  doneMessage={t('mine.cancelled')}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
    </>
  );
};

const EquipmentRentals: React.FC = () => {
  const { t } = useTranslation(['rentals', 'common']);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'bookings' ? 'bookings' : 'find';

  return (
    <AppShell>
      <PageHeader title={t('farmer.title')} subtitle={t('farmer.subtitle')} />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams(v === 'bookings' ? { tab: 'bookings' } : {}, { replace: true })}
      >
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="find">{t('farmer.tabFind')}</TabsTrigger>
          <TabsTrigger value="bookings">{t('farmer.tabBookings')}</TabsTrigger>
        </TabsList>
        <TabsContent value="find">
          <FindEquipment />
        </TabsContent>
        <TabsContent value="bookings">
          <MyBookings />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default EquipmentRentals;
