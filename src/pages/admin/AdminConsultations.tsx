import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import ConsultationCard from '@/components/advice/ConsultationCard';
import ReassignDialog from '@/components/advice/ReassignDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { adviceApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { CONSULTATION_STATUSES, type ConsultationStatus } from '@/lib/types';

const ALL = 'all';

/** Every consultation, including those addressed to a KVK; admins can reassign. */
const AdminConsultations: React.FC = () => {
  const { t } = useTranslation(['advice', 'common']);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ConsultationStatus | typeof ALL>(ALL);
  const [unassigned, setUnassigned] = useState(false);
  const filters = {
    scope: unassigned ? ('open' as const) : ('all' as const),
    status: !unassigned && status !== ALL ? [status] : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const query = useQuery({
    queryKey: ['consultations', 'admin', filters],
    queryFn: () => adviceApi.consultations(filters),
    placeholderData: keepPreviousData,
  });

  return (
    <AppShell>
      <PageHeader title={t('adminList.title')} subtitle={t('adminList.subtitle')} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={status}
          disabled={unassigned}
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
            {CONSULTATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`common:consultationStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="unassigned-only"
            checked={unassigned}
            onCheckedChange={(v) => {
              setUnassigned(v);
              setPage(0);
            }}
          />
          <Label htmlFor="unassigned-only">{t('adminList.unassignedOnly')}</Label>
        </div>
      </div>
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : !query.data || query.data.total === 0 ? (
        <EmptyState icon={Inbox} title={t('adminList.empty')} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('adminList.count', { count: query.data.total })}
          </p>
          {query.data.items.map((c) => (
            <ConsultationCard
              key={c.id}
              consultation={c}
              showFarmer
              actions={c.status !== 'closed' ? <ReassignDialog consultationId={c.id} currentExpertId={c.expert_id} /> : undefined}
            />
          ))}
          <Pager page={page} total={query.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      )}
    </AppShell>
  );
};

export default AdminConsultations;
