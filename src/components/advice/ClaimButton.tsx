import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { adviceApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

/** Expert: take an unassigned question and open its thread. */
const ClaimButton: React.FC<{ consultationId: number }> = ({ consultationId }) => {
  const { t } = useTranslation(['advice', 'common']);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const claim = useMutation({
    mutationFn: () => adviceApi.claim(consultationId),
    onSuccess: () => {
      toast.success(t('thread.claimed'));
      void queryClient.invalidateQueries({ queryKey: ['consultations'] });
      navigate(`/consultations/${consultationId}`);
    },
    onError: (err) => {
      toast.error(errorMessage(t, err));
      void queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
  });
  return (
    <Button size="sm" onClick={() => claim.mutate()} disabled={claim.isPending}>
      {t('thread.claim')}
    </Button>
  );
};

export default ClaimButton;
