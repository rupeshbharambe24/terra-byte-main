import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { RoleBadge } from '@/components/admin/badges';
import { DeleteButton, ModerateButton, ModerationBadge, ReportButton } from '@/components/forum/ForumActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fileUrl, forumApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { canDelete, canReport, isOwn, moderationAction } from '@/lib/forum';
import { formatDateTime } from '@/lib/format';
import type { Author, ForumPostDetail, ModerationStatus } from '@/lib/types';

const Byline: React.FC<{ author: Author; date: string; you: boolean }> = ({ author, date, you }) => {
  const { t, i18n } = useTranslation('forum');
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span className="font-medium text-gray-700 dark:text-gray-200">
        {author.name}
        {you && ` (${t('post.you')})`}
      </span>
      <RoleBadge role={author.role} />
      <span>{formatDateTime(date, i18n.resolvedLanguage)}</span>
    </div>
  );
};

interface ItemActionsProps {
  kind: 'post' | 'reply';
  id: number;
  author: Author;
  status: ModerationStatus;
  onDeleted?: () => void;
}

const ItemActions: React.FC<ItemActionsProps> = ({ kind, id, author, status, onDeleted }) => {
  const { user } = useAuth();
  const item = { author, moderation_status: status };
  const moderation = moderationAction(user, status);
  return (
    <div className="flex flex-wrap gap-1">
      {canReport(user, item) && <ReportButton kind={kind} id={id} />}
      {canDelete(user, item) && <DeleteButton kind={kind} id={id} onDeleted={onDeleted} />}
      {moderation && <ModerateButton kind={kind} id={id} action={moderation} />}
    </div>
  );
};

/** One forum discussion: the post, its replies, a reply box, reporting and moderation. */
const ForumPost: React.FC = () => {
  const { t } = useTranslation(['forum', 'common']);
  const { postId } = useParams();
  const id = Number(postId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['forum', 'post', id],
    queryFn: () => forumApi.post(id),
    enabled: Number.isFinite(id),
  });

  const mutation = useMutation({
    mutationFn: () => forumApi.reply(id, reply.trim()),
    onSuccess: (updated: ForumPostDetail) => {
      queryClient.setQueryData(['forum', 'post', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['forum', 'posts'] });
      setReply('');
      toast.success(t('post.replied'));
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const back = (
    <Link to="/forums" className="mb-4 inline-flex items-center gap-1 text-sm text-green-700 hover:underline dark:text-green-400">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t('post.back')}
    </Link>
  );

  if (!Number.isFinite(id) || (isError && error instanceof ApiError && error.status === 404)) {
    return (
      <AppShell>
        {back}
        <EmptyState title={t('post.notAvailable')} body={t('post.notAvailableBody')} icon={MessageSquareOff} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {back}
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <ErrorAlert error={error} />
        ) : post ? (
          <>
            <Card>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h1 className="min-w-0 break-words text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                    {post.title}
                  </h1>
                  <ModerationBadge status={post.moderation_status} />
                </div>
                <Byline author={post.author} date={post.created_at} you={isOwn(user, post)} />
                <div className="flex flex-wrap gap-2">
                  {post.category && <Badge variant="secondary">{t(`categories.${post.category}`)}</Badge>}
                  {post.crop && <Badge variant="outline">{post.crop}</Badge>}
                </div>
                <p className="whitespace-pre-line break-words text-gray-800 dark:text-gray-200">{post.body}</p>
                {post.image_path && (
                  <img
                    src={fileUrl(post.image_path) ?? undefined}
                    alt={t('post.photoAlt')}
                    className="max-h-96 w-full rounded-lg border object-contain"
                  />
                )}
                <ItemActions
                  kind="post"
                  id={post.id}
                  author={post.author}
                  status={post.moderation_status}
                  onDeleted={() => navigate('/forums')}
                />
              </CardContent>
            </Card>

            <h2 className="mb-3 mt-6 text-lg font-semibold text-gray-900 dark:text-white">
              {t('post.replies')} ({post.replies.length})
            </h2>
            {post.replies.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('post.noReplies')}</p>
            ) : (
              <ul className="space-y-3">
                {post.replies.map((r) => (
                  <li key={r.id}>
                    <Card className={r.moderation_status !== 'published' ? 'opacity-75' : undefined}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Byline author={r.author} date={r.created_at} you={isOwn(user, r)} />
                          <ModerationBadge status={r.moderation_status} />
                        </div>
                        <p className="whitespace-pre-line break-words text-gray-800 dark:text-gray-200">{r.body}</p>
                        <ItemActions kind="reply" id={r.id} author={r.author} status={r.moderation_status} />
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {post.moderation_status === 'published' ? (
              <form
                className="mt-6 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reply.trim()) mutation.mutate();
                }}
              >
                <Label htmlFor="forum-reply">{t('post.replyLabel')}</Label>
                <Textarea
                  id="forum-reply"
                  rows={3}
                  value={reply}
                  maxLength={3000}
                  placeholder={t('post.replyPlaceholder')}
                  onChange={(e) => setReply(e.target.value)}
                />
                <Button
                  type="submit"
                  disabled={mutation.isPending || !reply.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {t('post.send')}
                </Button>
              </form>
            ) : (
              <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">{t('post.closedForReplies')}</p>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
};

export default ForumPost;
