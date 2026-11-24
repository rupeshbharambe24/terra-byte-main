import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Clock, Inbox, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import Section from '@/components/dashboard/Section';
import StatCard from '@/components/dashboard/StatCard';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/lib/api';
import { formatHours } from '@/lib/dashboard';
import { formatDate } from '@/lib/format';

const ExpertDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const lng = i18n.resolvedLanguage;
  const units = { min: t('shared.unitMin'), h: t('shared.unitHour') };
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard', 'expert'], queryFn: dashboardApi.expert });
  const rt = data?.response_times;

  return (
    <AppShell>
      <PageHeader title={t('expert.title')} subtitle={user ? t('shared.welcome', { name: user.name }) : undefined} />
      {isLoading ? (
        <PageSpinner />
      ) : isError || !data || !rt ? (
        <ErrorAlert error={error} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Inbox} label={t('expert.unassigned')} value={data.open_unassigned} hint={t('expert.unassignedHint')} to="/expert-consultations" />
            <StatCard icon={MessageSquare} label={t('expert.waiting')} value={data.waiting_for_me} hint={t('expert.waitingHint')} to="/expert-consultations" />
            <StatCard icon={CheckCircle2} label={t('expert.answered')} value={data.answered_by_me} hint={t('expert.closed', { count: data.closed_by_me })} />
            <StatCard
              icon={BookOpen}
              label={t('expert.articles')}
              value={data.articles_published}
              hint={t('expert.drafts', { count: data.articles_draft })}
              to="/expert-knowledge"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('expert.responseTime')} note={t('expert.responseTimeNote')}>
              {rt.responded === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('expert.noReplies')}</p>
              ) : (
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">{t('shared.median')}</dt>
                    <dd className="text-2xl font-bold">
                      <Clock className="mr-1 inline h-5 w-5 text-green-700" aria-hidden="true" />
                      {formatHours(rt.median_hours, lng, units)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">{t('shared.average')}</dt>
                    <dd className="text-2xl font-bold">{formatHours(rt.average_hours, lng, units)}</dd>
                  </div>
                  <p className="col-span-2 text-xs text-gray-500">{t('shared.basedOn', { count: rt.responded })}</p>
                </dl>
              )}
            </Section>

            <Section title={t('expert.recent')} link={{ to: '/expert-consultations', label: t('shared.viewAll') }}>
              {data.recent.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('expert.noRecent')}</p>
              ) : (
                <ul className="divide-y dark:divide-gray-700">
                  {data.recent.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <Link to={`/consultations/${c.id}`} className="block truncate font-medium text-gray-900 hover:underline dark:text-gray-100">
                          {c.crop ? `${c.crop}: ` : ''}
                          {c.question}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {c.farmer_name}
                          {c.farmer_district ? ` · ${c.farmer_district}` : ''} · {formatDate(c.created_at, lng)}
                        </p>
                      </div>
                      <StatusPill kind="consultation" status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Section title={t('shared.quickLinks')}>
            <div className="flex flex-wrap gap-2">
              {[
                ['/expert-consultations', 'common:sidebar.consultations'],
                ['/expert-knowledge', 'common:sidebar.knowledgeBase'],
                ['/forums', 'common:sidebar.forums'],
                ['/notifications', 'common:sidebar.notifications'],
              ].map(([to, key]) => (
                <Link key={to} to={to} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  {t(key)}
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}
    </AppShell>
  );
};

export default ExpertDashboard;
