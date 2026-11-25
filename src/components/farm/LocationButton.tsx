import React, { useState } from 'react';
import { Loader2, LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { currentPosition, type LocationError } from '@/lib/farm';

interface Props {
  onLocate: (pos: { lat: number; lon: number }) => void;
  disabled?: boolean;
}

/** "Use my location": fills latitude/longitude from the device (only when the user taps it). */
const LocationButton: React.FC<Props> = ({ onLocate, disabled }) => {
  const { t } = useTranslation(['farm', 'common']);
  const [busy, setBusy] = useState(false);

  const locate = async () => {
    setBusy(true);
    try {
      onLocate(await currentPosition());
    } catch (err) {
      const code = (typeof err === 'string' ? err : 'unavailable') as LocationError;
      toast.error(t(`location.errors.${code}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void locate()} disabled={disabled || busy}>
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LocateFixed className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {busy ? t('location.locating') : t('location.use')}
    </Button>
  );
};

export default LocationButton;
