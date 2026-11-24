import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi, adviceApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

interface Props {
  consultationId: number;
  currentExpertId: number | null;
  size?: 'sm' | 'default';
}

/** Admin: give a consultation to another approved expert. */
const ReassignDialog: React.FC<Props> = ({ consultationId, currentExpertId, size = 'sm' }) => {
  const { t } = useTranslation(['advice', 'common']);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expertId, setExpertId] = useState<string>('');

  const experts = useQuery({
    queryKey: ['admin', 'users', { role: 'expert', status: 'approved', limit: 200 }],
    queryFn: ({ signal }) => adminApi.listUsers({ role: 'expert', status: 'approved', limit: 200 }, signal),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => adviceApi.assign(consultationId, Number(expertId)),
    onSuccess: (updated) => {
      toast.success(t('thread.reassigned', { name: updated.expert_name ?? '' }));
      setOpen(false);
      setExpertId('');
      void queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const choices = (experts.data?.items ?? []).filter((u) => u.id !== currentExpertId);

  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}>
        {t('thread.reassign')}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('thread.reassignTitle', { id: consultationId })}</DialogTitle>
            <DialogDescription>{t('thread.reassignBody')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`reassign-${consultationId}`}>{t('thread.chooseExpert')}</Label>
            {experts.isError ? (
              <p role="alert" className="text-sm text-red-600">{errorMessage(t, experts.error)}</p>
            ) : experts.data && choices.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('thread.noExperts')}</p>
            ) : (
              <Select value={expertId} onValueChange={setExpertId}>
                <SelectTrigger id={`reassign-${consultationId}`}>
                  <SelectValue placeholder={t('thread.chooseExpert')} />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                      {u.organization ? ` · ${u.organization}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={!expertId || mutation.isPending}>
              {t('thread.reassign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReassignDialog;
