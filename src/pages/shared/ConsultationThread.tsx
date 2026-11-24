import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import ImagePicker from '@/components/common/ImagePicker';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import StatusPill from '@/components/common/StatusPill';
import ConfirmButton from '@/components/advice/ConfirmButton';
import ReassignDialog from '@/components/advice/ReassignDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { paragraphs, threadPermissions } from '@/lib/advice';
import { adviceApi, fileUrl } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import type { ConsultationDetail } from '@/lib/types';
import { getDashboardRoute } from '@/utils/routeUtils';

const BACK: Record<string, string> = {
  farmer: '/kvk-consultation',
  expert: '/expert-consultations',
  admin: '/admin-consultations',
};

const Text: React.FC<{ text: string }> = ({ text }) => (
  <>
    {paragraphs(text).map((p, i) => (
      <p key={i} className="whitespace-pre-line break-words">
        {p}
      </p>
    ))}
  </>
);

/** One consultation with its messages; actions depend on who is looking. */
const ConsultationThread: React.FC = () => {
  const { consultationId } = useParams();
  const id = Number(consultationId);
  const { t, i18n } = useTranslation(['advice', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const lng = i18n.resolvedLanguage;

  const query = useQuery({
    queryKey: ['consultations', 'detail', id],
    queryFn: () => adviceApi.consultation(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  const onUpdated = (updated: ConsultationDetail) => {
    queryClient.setQueryData(['consultations', 'detail', id], updated);
    void queryClient.invalidateQueries({ queryKey: ['consultations'] });
  };
  const onError = (err: unknown) => toast.error(errorMessage(t, err));

  const claim = useMutation({
    mutationFn: () => adviceApi.claim(id),
    onSuccess: (c) => {
      onUpdated(c);
      toast.success(t('thread.claimed'));
    },
    onError,
  });
  const reply = useMutation({
    mutationFn: () => adviceApi.reply(id, body.trim(), image),
    onSuccess: (c) => {
      onUpdated(c);
      setBody('');
      setImage(null);
      toast.success(t('thread.sent'));
    },
    onError,
  });
  const setStatus = useMutation({
    mutationFn: (status: 'answered' | 'closed') => adviceApi.setStatus(id, status),
    onSuccess: (c, status) => {
      onUpdated(c);
      toast.success(status === 'closed' ? t('thread.closedToast') : t('thread.markedAnswered'));
    },
    onError,
  });

  const back = BACK[user?.role ?? ''] ?? getDashboardRoute(user?.role);
  const c = query.data;
  const can = c ? threadPermissions(user, c) : null;
  const busy = claim.isPending || reply.isPending || setStatus.isPending;
  const photo = fileUrl(c?.image_path);

  return (
    <AppShell>
      <Link
        to={back}
        className="mb-4 inline-flex items-center gap-1 text-sm text-green-700 hover:underline dark:text-green-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('thread.back')}
      </Link>

      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError || !c || !can ? (
        <ErrorAlert error={query.error} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-xl">{t('thread.title', { id: c.id })}</CardTitle>
                <StatusPill kind="consultation" status={c.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-gray-900 dark:text-gray-100">
                <Text text={c.question} />
              </div>
              {photo && (
                <a href={photo} target="_blank" rel="noreferrer" className="block w-full max-w-sm">
                  <img src={photo} alt={t('thread.photo')} className="max-h-72 w-full rounded-lg border object-cover" />
                </a>
              )}
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-gray-500">{t('thread.farmer')}</dt>
                <dd>
                  {c.farmer_name}
                  {c.farmer_district ? ` · ${c.farmer_district}` : ''}
                </dd>
                <dt className="text-gray-500">{t('thread.expert')}</dt>
                <dd>{c.expert_name ?? t('mine.noExpert')}</dd>
                {c.category && (
                  <>
                    <dt className="text-gray-500">{t('thread.category')}</dt>
                    <dd>{t(`categories.${c.category}`)}</dd>
                  </>
                )}
                {c.crop && (
                  <>
                    <dt className="text-gray-500">{t('thread.crop')}</dt>
                    <dd>{c.crop}</dd>
                  </>
                )}
                {c.kvk_name && (
                  <>
                    <dt className="text-gray-500">{t('thread.kvk')}</dt>
                    <dd>{c.kvk_name}</dd>
                  </>
                )}
                <dt className="text-gray-500">{t('thread.asked')}</dt>
                <dd>{formatDateTime(c.created_at, lng)}</dd>
              </dl>
              {(can.canClaim || can.canMarkAnswered || can.canClose || can.canReassign) && (
                <div className="flex flex-wrap gap-2">
                  {can.canClaim && (
                    <Button size="sm" onClick={() => claim.mutate()} disabled={busy}>
                      {t('thread.claim')}
                    </Button>
                  )}
                  {can.canMarkAnswered && (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate('answered')} disabled={busy}>
                      {t('thread.markAnswered')}
                    </Button>
                  )}
                  {can.canReassign && <ReassignDialog consultationId={c.id} currentExpertId={c.expert_id} />}
                  {can.canClose && (
                    <ConfirmButton
                      label={t('thread.close')}
                      title={t('thread.closeTitle')}
                      body={t('thread.closeBody')}
                      confirmLabel={t('thread.close')}
                      cancelLabel={t('common:actions.cancel')}
                      onConfirm={() => setStatus.mutate('closed')}
                      disabled={busy}
                    />
                  )}
                </div>
              )}
              {user?.role === 'expert' && c.status === 'open' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('thread.claimHint')}</p>
              )}
            </CardContent>
          </Card>

          <section aria-labelledby="thread-messages" className="space-y-3">
            <h2 id="thread-messages" className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('thread.messages')}
            </h2>
            {c.messages.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user?.role === 'farmer' ? t('thread.noMessagesFarmer') : t('thread.noMessages')}
              </p>
            ) : (
              <ol className="space-y-3">
                {c.messages.map((m) => {
                  const mine = m.author_id === user?.id;
                  const src = fileUrl(m.image_path);
                  return (
                    <li
                      key={m.id}
                      className={`rounded-lg border p-3 ${
                        m.author_role === 'expert'
                          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {mine ? t('thread.you') : m.author_name}
                          <span className="font-normal text-gray-500"> · {t(`common:roles.${m.author_role}`)}</span>
                        </span>
                        <time dateTime={m.created_at} className="text-gray-500">
                          {formatDateTime(m.created_at, lng)}
                        </time>
                      </div>
                      <div className="space-y-2 text-gray-800 dark:text-gray-200">
                        <Text text={m.body} />
                      </div>
                      {src && (
                        <a href={src} target="_blank" rel="noreferrer" className="mt-2 block max-w-xs">
                          <img src={src} alt={t('thread.photo')} className="max-h-60 w-full rounded border object-cover" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {c.status === 'closed' ? (
            <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t('thread.closedNote')}
            </p>
          ) : can.canReply ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (body.trim()) reply.mutate();
                  }}
                >
                  <Label htmlFor="reply">{t('thread.reply')}</Label>
                  <Textarea
                    id="reply"
                    value={body}
                    maxLength={4000}
                    rows={4}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('thread.replyPlaceholder')}
                  />
                  <ImagePicker value={image} onChange={setImage} disabled={busy} />
                  <Button type="submit" disabled={!body.trim() || busy}>
                    {reply.isPending ? t('thread.sending') : t('thread.send')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </AppShell>
  );
};

export default ConsultationThread;
