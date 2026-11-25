import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Tractor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rentalsApi } from '@/lib/api';
import { formatDateTime, formatMonth, formatMoney, todayIST } from '@/lib/format';
import { CALENDAR_STATUSES, dayStatuses, monthGrid, monthWindow, shiftMonth } from '@/lib/rentals';
import type { BookingStatus } from '@/lib/types';

const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

const DAY_CLASS: Partial<Record<BookingStatus, string>> = {
  requested: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  accepted: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  completed: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
};

/** Short weekday names, Monday first (1 Jan 2024 was a Monday). */
function weekdayNames(language: string | undefined): string[] {
  const fmt = new Intl.DateTimeFormat(LOCALES[language ?? 'en'] ?? 'en-IN', { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

const HardwareCalendar: React.FC = () => {
  const { t, i18n } = useTranslation(['rentals', 'common']);
  const lng = i18n.resolvedLanguage;
  const today = todayIST();
  const [month, setMonth] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState<number | null>(null);

  const equipment = useQuery({
    queryKey: ['equipment', 'mine', 'calendar'],
    queryFn: () => rentalsApi.myEquipment({ limit: 100 }),
  });
  const equipmentId = selected ?? equipment.data?.items[0]?.id ?? null;
  const window = monthWindow(month.year, month.month);
  const bookings = useQuery({
    queryKey: ['bookings', 'calendar', equipmentId, window],
    queryFn: () => rentalsApi.bookings({ equipment_id: equipmentId as number, ...window, limit: 100 }),
    enabled: equipmentId !== null,
  });

  const weeks = useMemo(() => monthGrid(month.year, month.month), [month]);
  const statuses = useMemo(() => dayStatuses(bookings.data?.items ?? []), [bookings.data]);
  const weekdays = useMemo(() => weekdayNames(lng), [lng]);
  const monthLabel = formatMonth(`${month.year}-${String(month.month).padStart(2, '0')}`, lng);

  return (
    <AppShell>
      <PageHeader title={t('calendar.title')} subtitle={t('calendar.subtitle')} />
      {equipment.isLoading ? (
        <PageSpinner />
      ) : equipment.isError ? (
        <ErrorAlert error={equipment.error} />
      ) : !equipment.data || equipment.data.items.length === 0 ? (
        <EmptyState icon={Tractor} title={t('calendar.noEquipment')} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:w-80">
              <Select value={String(equipmentId)} onValueChange={(v) => setSelected(Number(v))}>
                <SelectTrigger aria-label={t('calendar.equipment')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {equipment.data.items.map((eq) => (
                    <SelectItem key={eq.id} value={String(eq.id)}>
                      {eq.name}
                      {eq.active ? '' : ` (${t('equipment.inactive')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={t('calendar.prev')}
                onClick={() => setMonth((m) => shiftMonth(m.year, m.month, -1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="min-w-[8rem] text-center font-medium" aria-live="polite">{monthLabel}</span>
              <Button
                variant="outline"
                size="icon"
                aria-label={t('calendar.next')}
                onClick={() => setMonth((m) => shiftMonth(m.year, m.month, 1))}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <Card className="mb-4">
            <CardContent className="p-2 sm:p-4">
              <table className="w-full table-fixed border-separate border-spacing-1 text-center text-sm" aria-label={monthLabel}>
                <thead>
                  <tr>
                    {weekdays.map((d) => (
                      <th key={d} scope="col" className="truncate py-1 text-xs font-medium text-gray-500">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((day, di) => {
                        if (!day) return <td key={di} />;
                        const status = statuses[day];
                        const isToday = day === today;
                        return (
                          <td
                            key={day}
                            className={`h-10 rounded-md sm:h-14 ${status ? DAY_CLASS[status] : 'bg-gray-50 dark:bg-gray-800'} ${isToday ? 'ring-2 ring-green-600' : ''}`}
                            title={status ? t(`common:bookingStatus.${status}`) : undefined}
                          >
                            <span className="font-medium">{Number(day.slice(8))}</span>
                            {status && <span className="sr-only"> {t(`common:bookingStatus.${status}`)}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="mt-3 flex flex-wrap gap-3 text-xs" aria-label={t('calendar.legend')}>
                {CALENDAR_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-1">
                    <span className={`inline-block h-3 w-3 rounded ${DAY_CLASS[s]}`} aria-hidden="true" />
                    {t(`common:bookingStatus.${s}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <h2 className="mb-2 text-lg font-semibold">{t('calendar.monthBookings', { month: monthLabel })}</h2>
          {bookings.isLoading ? (
            <PageSpinner />
          ) : bookings.isError ? (
            <ErrorAlert error={bookings.error} />
          ) : !bookings.data || bookings.data.items.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t('calendar.noBookings')} />
          ) : (
            <ul className="space-y-2">
              {[...bookings.data.items]
                .sort((a, b) => a.start_at.localeCompare(b.start_at))
                .map((b) => (
                  <li key={b.id}>
                    <Card>
                      <CardContent className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium break-words">
                            {t('period', { start: formatDateTime(b.start_at, lng), end: formatDateTime(b.end_at, lng) })}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {b.farmer_name} · {formatMoney(b.amount_inr, lng)}
                          </p>
                        </div>
                        <StatusPill kind="booking" status={b.status} />
                      </CardContent>
                    </Card>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </AppShell>
  );
};

export default HardwareCalendar;
