import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { errorMessage } from '@/lib/errors';

/** Translated error box for a failed query or mutation. */
export const ErrorAlert: React.FC<{ error: unknown; className?: string }> = ({ error, className }) => {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200 ${className ?? ''}`}
    >
      {errorMessage(t, error)}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

/** Shown instead of a list or chart when there is no data yet (never placeholder numbers). */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, icon: Icon = Inbox, action }) => (
  <Card>
    <CardContent className="flex flex-col items-center p-8 text-center">
      <Icon className="mb-3 h-10 w-10 text-gray-400" aria-hidden="true" />
      <p className="font-medium text-gray-900 dark:text-gray-100">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </CardContent>
  </Card>
);
