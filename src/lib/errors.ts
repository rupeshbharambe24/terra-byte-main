import type { TFunction } from 'i18next';
import { ApiError } from './api';

/** Translated, user-facing message for any thrown error (API codes map to common:errors.*). */
export function errorMessage(t: TFunction, err: unknown): string {
  if (err instanceof ApiError) {
    return t(`common:errors.${err.code}`, { defaultValue: err.message || t('common:errors.generic') });
  }
  return t('common:errors.generic');
}
