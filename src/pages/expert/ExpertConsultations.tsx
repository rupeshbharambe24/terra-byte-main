import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import ClaimButton from '@/components/advice/ClaimButton';
import ConsultationCard from '@/components/advice/ConsultationCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adviceApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { CONSULTATION_STATUSES, type ConsultationStatus } from '@/lib/types';

const ALL = 'all';

const QuestionList: React.FC<{ scope: 'open' | 'mine' }> = ({ scope }) => {
  const { t } = useTranslation(['advice', 'common']);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ConsultationStatus | typeof ALL>(ALL);
  const filters = {
    scope,
    status: scope === 'mine' && status !== ALL ? [status] : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const query = useQuery({
    queryKey: ['consultations', 'expert', filters],
    queryFn: () => adviceApi.consultations(filters),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-3">
      {scope === 'mine' && (
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ConsultationStatus | typeof ALL);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-64" aria-label={t('expertList.statusFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('expertList.allStatuses')}</SelectItem>
            {CONSULTATION_STATUSES.filter((s) => s !== 'open').map((s) => (
              <SelectItem key={s} value={s}>
                {t(`common:consultationStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : !query.data || query.data.total === 0 ? (
        <EmptyState icon={Inbox} title={scope === 'open' ? t('expertList.emptyOpen') : t('expertList.emptyMine')} />
      ) : (
        <>
          {query.data.items.map((c) => (
            <ConsultationCard
              key={c.id}
              consultation={c}
              showFarmer
              actions={scope === 'open' && c.expert_id === null ? <ClaimButton consultationId={c.id} /> : undefined}
            />
          ))}
          <Pager page={page} total={query.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
};

/** Expert inbox: unassigned questions to take, and the questions they are answering. */
const ExpertConsultations: React.FC = () => {
  const { t } = useTranslation(['advice', 'common']);
  return (
    <AppShell>
      <PageHeader title={t('expertList.title')} subtitle={t('expertList.subtitle')} />
      <Tabs defaultValue="open">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="open">{t('expertList.tabOpen')}</TabsTrigger>
          <TabsTrigger value="mine">{t('expertList.tabMine')}</TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <QuestionList scope="open" />
        </TabsContent>
        <TabsContent value="mine">
          <QuestionList scope="mine" />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default ExpertConsultations;
