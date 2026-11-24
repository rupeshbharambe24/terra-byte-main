import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { notificationsApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/lib/types';

/** The signed-in user's notifications (stored server-side for every status change). */
const Notifications: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);

  const filters = { unread_only: unreadOnly || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['notifications', 'list', filters],
    queryFn: () => notificationsApi.list(filters),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => void refresh(),
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success(t('notifications.allRead'));
      void refresh();
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const open = async (n: Notification) => {
    if (!n.read_at) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        /* error already shown; still open the link */
      }
    }
    if (n.link) navigate(n.link);
  };

  const unread = data?.unread ?? 0;
  return (
    <AppShell>
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={
          <Button variant="outline" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('notifications.markAllRead')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="notif-unread"
            checked={unreadOnly}
            onCheckedChange={(v) => {
              setUnreadOnly(v);
              setPage(0);
            }}
          />
          <Label htmlFor="notif-unread">{t('notifications.unreadOnly')}</Label>
        </div>
        {data && (
          <span className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('notifications.unreadCount', { count: unread })}
          </span>
        )}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data && data.items.length === 0 ? (
        unreadOnly ? (
          <EmptyState title={t('notifications.emptyUnread')} icon={Bell} />
        ) : (
          <EmptyState title={t('notifications.empty')} body={t('notifications.emptyBody')} icon={Bell} />
        )
      ) : (
        <>
          <ul className={`space-y-2 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {data?.items.map((n) => {
              const isUnread = !n.read_at;
              return (
                <li key={n.id}>
                  <Card
                    className={
                      isUnread ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/40' : undefined
                    }
                  >
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isUnread && (
                            <Badge className="bg-green-600 text-white hover:bg-green-600">{t('notifications.new')}</Badge>
                          )}
                          <p className={`break-words ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white`}>
                            {n.title}
                          </p>
                        </div>
                        {n.body && (
                          <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-700 dark:text-gray-300">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(n.created_at, i18n.resolvedLanguage)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {n.link && (
                          <Button size="sm" variant="outline" onClick={() => void open(n)}>
                            {t('notifications.open')}
                          </Button>
                        )}
                        {isUnread && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={markRead.isPending}
                            onClick={() => markRead.mutate(n.id)}
                          >
                            {t('notifications.markRead')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </AppShell>
  );
};

export default Notifications;
