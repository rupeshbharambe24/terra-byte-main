const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

export function formatDate(iso: string | null | undefined, language: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALES[language ?? 'en'] ?? 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLocation(parts: Array<string | null | undefined>): string {
  const text = parts.filter(Boolean).join(', ');
  return text || '—';
}
