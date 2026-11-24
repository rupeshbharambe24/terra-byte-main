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
import { rentalsApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { Booking, BookingAction } from '@/lib/types';

interface Props {
  booking: Booking;
  action: BookingAction;
  label: string;
  title: string;
  body: string;
  doneMessage: string;
  variant?: 'default' | 'outline' | 'destructive';
  disabled?: boolean;
  /** Ask for an optional reason (reject / cancel). */
  withReason?: boolean;
}

/** Button + confirmation dialog that runs one booking transition on the server. */
const BookingActionDialog: React.FC<Props> = ({
  booking,
  action,
  label,
  title,
  body,
  doneMessage,
  variant = 'outline',
  disabled,
  withReason,
}) => {
  const { t } = useTranslation(['rentals', 'common']);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => rentalsApi.bookingAction(booking.id, action, withReason ? reason.trim() || undefined : undefined),
    onSuccess: () => {
      toast.success(doneMessage);
      setOpen(false);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const confirmClass = action === 'accept' || action === 'complete' ? 'bg-green-600 hover:bg-green-700 text-white' : undefined;

  return (
    <>
      <Button size="sm" variant={variant} className={confirmClass} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !mutation.isPending && setOpen(o)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{body}</DialogDescription>
          </DialogHeader>
          {withReason && (
            <div className="space-y-2">
              <Label htmlFor={`booking-reason-${booking.id}`}>{t('rentals:reasonLabel')}</Label>
              <Textarea
                id={`booking-reason-${booking.id}`}
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              {t('common:actions.close')}
            </Button>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              className={confirmClass}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('common:actions.saving') : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingActionDialog;
