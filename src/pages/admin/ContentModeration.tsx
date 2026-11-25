import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { RoleBadge } from '@/components/admin/badges';
import { ModerateButton, ModerationBadge } from '@/components/forum/ForumActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { forumApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { excerpt } from '@/lib/forum';
import { formatDateTime } from '@/lib/format';
import type { ForumReport, ReportStatus } from '@/lib/types';

const STATUSES: ReportStatus[] = ['open', 'resolved', 'dismissed'];

const DismissButton: React.FC<{ report: ForumReport }> = ({ report }) => {
  const { t } = useTranslation(['forum', 'common']);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => forumApi.dismissReport(report.id),
    onSuccess: () => {
      toast.success(t('moderationPage.dismissed'));
      void queryClient.invalidateQueries({ queryKey: ['forum-reports'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  return (
    <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {t('moderationPage.dismiss')}
    </Button>
  );
};

/** Admin queue of forum reports: hide or restore the reported content, or dismiss the report. */
const ContentModeration: React.FC = () => {
  const { t, i18n } = useTranslation(['forum', 'common']);
  const [status, setStatus] = useState<ReportStatus>('open');
  const [page, setPage] = useState(0);
  const filters = { status, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['forum-reports', filters],
    queryFn: () => forumApi.reports(filters),
    placeholderData: keepPreviousData,
  });

  return (
    <AppShell>
      <PageHeader title={t('moderationPage.title')} subtitle={t('moderationPage.subtitle')} />
      <div className="mb-4 w-full sm:w-56">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ReportStatus);
            setPage(0);
          }}
        >
          <SelectTrigger aria-label={t('moderationPage.statusFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`moderationPage.statuses.${s}`)}
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
        <EmptyState title={t('moderationPage.empty')} icon={ShieldCheck} />
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('moderationPage.count', { count: data?.total ?? 0 })}
          </p>
          <ul className={`space-y-3 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {data?.items.map((r) => {
              const contentAction =
                r.target_status === 'published' ? 'hide' : r.target_status === 'hidden' ? 'restore' : null;
              return (
                <li key={r.id}>
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{t(`moderationPage.target.${r.target_type}`)}</Badge>
                        <ModerationBadge status={r.target_status} />
                        <Badge variant="outline">{t(`moderationPage.statuses.${r.status}`)}</Badge>
                        <span className="text-xs text-gray-500">
                          {t('moderationPage.reportedOn', { date: formatDateTime(r.created_at, i18n.resolvedLanguage) })}
                        </span>
                      </div>
                      <div className="rounded-md border bg-gray-50 p-3 dark:bg-gray-900">
                        {r.target_title && (
                          <p className="break-words font-semibold text-gray-900 dark:text-white">{r.target_title}</p>
                        )}
                        <p className="whitespace-pre-line break-words text-sm text-gray-700 dark:text-gray-300">
                          {excerpt(r.target_body, 400)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{t('moderationPage.author')}:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{r.target_author.name}</span>
                          <RoleBadge role={r.target_author.role} />
                        </div>
                      </div>
                      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
                        <dt className="text-gray-500">{t('moderationPage.reason')}</dt>
                        <dd className="break-words text-gray-900 dark:text-gray-100">{r.reason}</dd>
                      </dl>
                      <p className="text-xs text-gray-500">{t('moderationPage.reportedBy', { name: r.reporter.name })}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {contentAction && (r.status === 'open' || contentAction === 'restore') && (
                          <ModerateButton kind={r.target_type} id={r.target_id} action={contentAction} />
                        )}
                        {r.status === 'open' && <DismissButton report={r} />}
                        <Button asChild variant="link" size="sm" className="px-0">
                          <Link to={`/forums/${r.post_id}`}>{t('moderationPage.openPost')}</Link>
                        </Button>
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

export default ContentModeration;
