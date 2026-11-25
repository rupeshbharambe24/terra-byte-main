import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { BookingStatus, ConsultationStatus, OrderStatus } from '@/lib/types';

const TONE: Record<string, string> = {
  // orders
  placed: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  // bookings
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  // consultations
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  answered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

type Props =
  | { kind: 'order'; status: OrderStatus }
  | { kind: 'booking'; status: BookingStatus }
  | { kind: 'consultation'; status: ConsultationStatus };

/** Translated, colour-coded status of an order, booking or consultation. */
const StatusPill: React.FC<Props> = ({ kind, status }) => {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={`border-transparent whitespace-nowrap ${TONE[status] ?? ''}`}>
      {t(`${kind}Status.${status}`)}
    </Badge>
  );
};

export default StatusPill;
