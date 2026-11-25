import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { Booking, Equipment } from '@/lib/types';

/** "₹900 / hour · ₹6,000 / day" for whatever rates the owner offers. */
export const RateLine: React.FC<{ equipment: Equipment }> = ({ equipment }) => {
  const { t, i18n } = useTranslation('rentals');
  const lng = i18n.resolvedLanguage;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-green-700 dark:text-green-400">
      {equipment.rate_per_hour_inr !== null && (
        <span>{t('rate.perHour', { amount: formatMoney(equipment.rate_per_hour_inr, lng) })}</span>
      )}
      {equipment.rate_per_day_inr !== null && (
        <span>{t('rate.perDay', { amount: formatMoney(equipment.rate_per_day_inr, lng) })}</span>
      )}
    </div>
  );
};

export const BookingSummary: React.FC<{ booking: Booking; showFarmer?: boolean }> = ({ booking, showFarmer }) => {
  const { t, i18n } = useTranslation('rentals');
  const lng = i18n.resolvedLanguage;
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
      <dt className="text-gray-500">{t('booking.period')}</dt>
      <dd className="break-words">
        {t('period', { start: formatDateTime(booking.start_at, lng), end: formatDateTime(booking.end_at, lng) })}
      </dd>
      <dt className="text-gray-500">{t('booking.duration')}</dt>
      <dd>{t(booking.unit === 'hour' ? 'duration.hours' : 'duration.days', { count: booking.units })}</dd>
      <dt className="text-gray-500">{t('booking.amount')}</dt>
      <dd className="font-medium">
        {formatMoney(booking.amount_inr, lng)}{' '}
        <span className="font-normal text-gray-500">
          ({t(booking.unit === 'hour' ? 'rate.perHour' : 'rate.perDay', { amount: formatMoney(booking.rate_inr, lng) })})
        </span>
      </dd>
      {showFarmer ? (
        <>
          <dt className="text-gray-500">{t('booking.farmer')}</dt>
          <dd>
            {booking.farmer_name}
            {booking.farmer_phone && (
              <>
                {' · '}
                <a className="text-green-700 underline dark:text-green-400" href={`tel:${booking.farmer_phone}`}>
                  {booking.farmer_phone}
                </a>
              </>
            )}
          </dd>
        </>
      ) : (
        <>
          <dt className="text-gray-500">{t('booking.owner')}</dt>
          <dd>{booking.owner_name}</dd>
        </>
      )}
      {booking.note && (
        <>
          <dt className="text-gray-500">{t('booking.note')}</dt>
          <dd className="whitespace-pre-line break-words">{booking.note}</dd>
        </>
      )}
      {booking.status_reason && (
        <>
          <dt className="text-gray-500">{t('booking.reason')}</dt>
          <dd className="break-words">{booking.status_reason}</dd>
        </>
      )}
    </dl>
  );
};

