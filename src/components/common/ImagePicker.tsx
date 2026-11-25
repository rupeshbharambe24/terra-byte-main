import React, { useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { fileUrl, uploadsApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

interface ImagePickerProps {
  /** Stored path (from POST /uploads/image) or null. */
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
  disabled?: boolean;
}

const MAX_MB = 8;

/** Uploads one image through the API (which re-encodes it and strips EXIF) and returns its path. */
const ImagePicker: React.FC<ImagePickerProps> = ({ value, onChange, label, disabled }) => {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(t('errors.payload_too_large'));
      return;
    }
    setBusy(true);
    try {
      const saved = await uploadsApi.image(file);
      onChange(saved.path);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const src = fileUrl(value);
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      {src ? (
        <div className="relative w-full max-w-xs">
          <img src={src} alt={t('image.preview')} className="h-40 w-full rounded-lg border object-cover" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={() => onChange(null)}
            disabled={disabled || busy}
            aria-label={t('image.remove')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />}
          {busy ? t('image.uploading') : src ? t('image.change') : t('image.upload')}
        </Button>
        <span className="text-xs text-gray-500">{t('image.hint', { mb: MAX_MB })}</span>
      </div>
      <input
        id={id}
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
        disabled={disabled || busy}
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ImagePicker;
