import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusPill from '@/components/common/StatusPill';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import type { Consultation } from '@/lib/types';

interface Props {
  consultation: Consultation;
  /** Show the farmer's name and district (expert and admin views). */
  showFarmer?: boolean;
  /** Extra buttons (claim, reassign) shown under the card text. */
  actions?: React.ReactNode;
}

/** One consultation in a list, linking to its thread. */
const ConsultationCard: React.FC<Props> = ({ consultation: c, showFarmer, actions }) => {
  const { t, i18n } = useTranslation(['advice', 'common']);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Link
            to={`/consultations/${c.id}`}
            className="min-w-0 flex-1 font-medium text-gray-900 hover:text-green-700 dark:text-gray-100 dark:hover:text-green-400"
          >
            <span className="text-gray-500">#{c.id} </span>
            <span className="break-words">{c.question.length > 160 ? `${c.question.slice(0, 160)}…` : c.question}</span>
          </Link>
          <StatusPill kind="consultation" status={c.status} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
          {c.category && <span>{t(`categories.${c.category}`)}</span>}
          {c.crop && <span>{t('thread.cropValue', { crop: c.crop })}</span>}
          {showFarmer && (
            <span>
              {t('thread.farmerValue', { name: c.farmer_name })}
              {c.farmer_district ? ` · ${c.farmer_district}` : ''}
            </span>
          )}
          <span>{c.expert_name ? t('mine.expert', { name: c.expert_name }) : t('mine.noExpert')}</span>
          {c.kvk_name && <span>{t('thread.kvkValue', { name: c.kvk_name })}</span>}
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {t('mine.messages', { count: c.message_count })}
          </span>
          <span>{t('mine.asked', { date: formatDate(c.created_at, i18n.resolvedLanguage) })}</span>
        </div>
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
};

export default ConsultationCard;
