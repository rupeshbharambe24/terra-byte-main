import React, { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Eye, Flag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { forumApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { ModerationStatus } from '@/lib/types';

type Kind = 'post' | 'reply';

const DIALOG = 'max-w-[calc(100vw-2rem)] sm:max-w-md';

/** Invalidate every forum list/detail and the moderation queue. */
function useForumRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['forum'] });
    void queryClient.invalidateQueries({ queryKey: ['forum-reports'] });
  };
}

export const ModerationBadge: React.FC<{ status: ModerationStatus }> = ({ status }) => {
  const { t } = useTranslation('forum');
  if (status === 'published') return null;
  const tone =
    status === 'hidden'
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  return (
    <Badge variant="outline" className={`border-transparent ${tone}`}>
      {t(`moderation.${status}`)}
    </Badge>
  );
};

/** Report a post or reply to the moderators (reason 3–500 characters). */
export const ReportButton: React.FC<{ kind: Kind; id: number }> = ({ kind, id }) => {
  const { t } = useTranslation(['forum', 'common']);
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({
    mutationFn: () => forumApi.report(kind, id, reason.trim()),
    onSuccess: () => {
      toast.success(t('report.done'));
      setOpen(false);
      setReason('');
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  const submit = () => {
    if (reason.trim().length < 3) {
      setInvalid(true);
      return;
    }
    mutation.mutate();
  };
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="mr-1 h-4 w-4" aria-hidden="true" />
        {t('report.action')}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <DialogContent className={DIALOG}>
          <DialogHeader>
            <DialogTitle>{t('report.title')}</DialogTitle>
            <DialogDescription>{t('report.body')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{t('report.reason')}</Label>
            <Textarea
              id={fieldId}
              value={reason}
              maxLength={500}
              aria-invalid={invalid}
              placeholder={t('report.reasonPlaceholder')}
              onChange={(e) => {
                setReason(e.target.value);
                setInvalid(false);
              }}
            />
            {invalid && <p className="text-sm text-red-600">{t('report.reasonInvalid')}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {t('report.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** The author removes their own post or reply. */
export const DeleteButton: React.FC<{ kind: Kind; id: number; onDeleted?: () => void }> = ({ kind, id, onDeleted }) => {
  const { t } = useTranslation(['forum', 'common']);
  const refresh = useForumRefresh();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => (kind === 'post' ? forumApi.deletePost(id) : forumApi.deleteReply(id)),
    onSuccess: () => {
      toast.success(t('delete.done'));
      setOpen(false);
      refresh();
      onDeleted?.();
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  return (
    <>
      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setOpen(true)}>
        <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
        {t('delete.action')}
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <AlertDialogContent className={DIALOG}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(kind === 'post' ? 'delete.postTitle' : 'delete.replyTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={mutation.isPending}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              {t('delete.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/** Admin: hide published content (with an optional reason for the author) or restore hidden content. */
export const ModerateButton: React.FC<{ kind: Kind; id: number; action: 'hide' | 'restore' }> = ({ kind, id, action }) => {
  const { t } = useTranslation(['forum', 'common']);
  const fieldId = useId();
  const refresh = useForumRefresh();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => forumApi.moderate(kind, id, action, action === 'hide' ? reason.trim() || undefined : undefined),
    onSuccess: () => {
      toast.success(t(action === 'hide' ? 'admin.hidden' : 'admin.restored'));
      setOpen(false);
      setReason('');
      refresh();
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  if (action === 'restore') {
    return (
      <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
        {t('admin.restore')}
      </Button>
    );
  }
  return (
    <>
      <Button variant="outline" size="sm" className="text-red-700" onClick={() => setOpen(true)}>
        <EyeOff className="mr-1 h-4 w-4" aria-hidden="true" />
        {t('admin.hide')}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <DialogContent className={DIALOG}>
          <DialogHeader>
            <DialogTitle>{t('admin.hideTitle')}</DialogTitle>
            <DialogDescription>{t('admin.hideBody')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{t('admin.reasonLabel')}</Label>
            <Textarea
              id={fieldId}
              value={reason}
              maxLength={500}
              placeholder={t('admin.reasonPlaceholder')}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {t('admin.hide')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
