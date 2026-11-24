import { describe, expect, it } from 'vitest';
import { canDelete, canReport, excerpt, isOwn, moderationAction } from './forum';

const author = { id: 1, name: 'Ramesh', role: 'farmer' as const };
const post = { author, moderation_status: 'published' as const };

describe('forum permissions', () => {
  it('authors delete, others report', () => {
    const me = { id: 1, role: 'farmer' as const };
    const other = { id: 2, role: 'expert' as const };
    expect(isOwn(me, post)).toBe(true);
    expect(canDelete(me, post)).toBe(true);
    expect(canReport(me, post)).toBe(false);
    expect(canDelete(other, post)).toBe(false);
    expect(canReport(other, post)).toBe(true);
    expect(canReport(null, post)).toBe(false);
  });

  it('hidden content cannot be reported or deleted; admins moderate', () => {
    const hidden = { author, moderation_status: 'hidden' as const };
    const admin = { id: 9, role: 'admin' as const };
    expect(canReport({ id: 2, role: 'farmer' }, hidden)).toBe(false);
    expect(canDelete({ id: 1, role: 'farmer' }, hidden)).toBe(false);
    expect(canReport(admin, post)).toBe(false);
    expect(moderationAction(admin, 'published')).toBe('hide');
    expect(moderationAction(admin, 'hidden')).toBe('restore');
    expect(moderationAction(admin, 'removed')).toBeNull();
    expect(moderationAction({ id: 2, role: 'farmer' }, 'published')).toBeNull();
  });

  it('excerpts on a word boundary', () => {
    expect(excerpt('short text')).toBe('short text');
    const long = 'word '.repeat(60);
    const out = excerpt(long, 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out).not.toMatch(/wor…$/);
  });
});
