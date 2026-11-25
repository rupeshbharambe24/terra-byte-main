import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { adminApi, type StatusAction } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { AdminUser } from '@/lib/types';

interface Props {
  user: AdminUser;
  action: StatusAction;
  size?: 'sm' | 'default';
}

/** Approve / reject / suspend button with a confirmation dialog and optional reason. */
const StatusActionButton: React.FC<Props> = ({ user, action, size = 'sm' }) => {
  const { t } = useTranslation(['admin', 'common']);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.changeStatus(user.id, action, action === 'approve' ? undefined : reason.trim()),
    onSuccess: (updated) => {
      toast.success(t(`actions.done.${action}`, { name: updated.name }));
      setOpen(false);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const label =
    action === 'approve' && user.status !== 'pending' ? t('actions.reinstate') : t(`actions.${action}`);
  const variant = action === 'approve' ? 'default' : action === 'suspend' ? 'destructive' : 'outline';

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : undefined}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t(`actions.confirmTitle.${action}`, { name: user.name })}</DialogTitle>
            <DialogDescription>{t(`actions.confirmBody.${action}`)}</DialogDescription>
          </DialogHeader>
          {action !== 'approve' && (
            <div className="space-y-2">
              <Label htmlFor={`reason-${user.id}`}>{t('actions.reasonLabel')}</Label>
              <Textarea
                id={`reason-${user.id}`}
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('actions.reasonPlaceholder')}
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant={variant}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : undefined}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StatusActionButton;
