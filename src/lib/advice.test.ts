import { describe, expect, it } from 'vitest';
import { blankToNull, missingDistricts, optionalNumber, paragraphs, threadPermissions } from './advice';

const base = { farmer_id: 1, expert_id: null as number | null, status: 'open' as const };

describe('threadPermissions', () => {
  it('lets any expert claim an open, unassigned question but not reply yet', () => {
    const p = threadPermissions({ id: 9, role: 'expert' }, base);
    expect(p).toMatchObject({ canClaim: true, canReply: false, canClose: false, canReassign: false });
  });

  it('lets the assigned expert reply, mark answered and close', () => {
    const c = { ...base, expert_id: 9, status: 'assigned' as const };
    expect(threadPermissions({ id: 9, role: 'expert' }, c)).toMatchObject({
      canClaim: false,
      canReply: true,
      canMarkAnswered: true,
      canClose: true,
    });
    // Another expert gets nothing.
    expect(threadPermissions({ id: 8, role: 'expert' }, c)).toMatchObject({ canReply: false, canClose: false });
    // Already answered: no second "mark answered".
    expect(threadPermissions({ id: 9, role: 'expert' }, { ...c, status: 'answered' }).canMarkAnswered).toBe(false);
  });

  it('lets the farmer reply and close their own question only', () => {
    expect(threadPermissions({ id: 1, role: 'farmer' }, base)).toMatchObject({ canReply: true, canClose: true, canClaim: false });
    expect(threadPermissions({ id: 2, role: 'farmer' }, base)).toMatchObject({ canReply: false, canClose: false });
  });

  it('lets admins reassign and close but not reply', () => {
    expect(threadPermissions({ id: 5, role: 'admin' }, base)).toMatchObject({
      canReassign: true,
      canClose: true,
      canReply: false,
    });
  });

  it('allows nothing on a closed question or without a user', () => {
    const closed = { ...base, expert_id: 9, status: 'closed' as const };
    for (const viewer of [{ id: 1, role: 'farmer' as const }, { id: 9, role: 'expert' as const }, { id: 5, role: 'admin' as const }]) {
      expect(Object.values(threadPermissions(viewer, closed)).some(Boolean)).toBe(false);
    }
    expect(Object.values(threadPermissions(null, base)).some(Boolean)).toBe(false);
  });
});

describe('advice helpers', () => {
  it('splits text into paragraphs on blank lines', () => {
    expect(paragraphs('One\nline two\n\n\nThree  \n \nFour')).toEqual(['One\nline two', 'Three', 'Four']);
    expect(paragraphs('  ')).toEqual([]);
  });

  it('lists Maharashtra districts with no KVK, ignoring case', () => {
    const missing = missingDistricts(['pune', 'Nashik ']);
    expect(missing).toHaveLength(34);
    expect(missing).not.toContain('Pune');
    expect(missing).toContain('Ahilyanagar');
  });

  it('normalises optional inputs', () => {
    expect(blankToNull('  ')).toBeNull();
    expect(blankToNull(' Baramati ')).toBe('Baramati');
    expect(optionalNumber('')).toBeNull();
    expect(optionalNumber('19.1')).toBe(19.1);
    expect(Number.isNaN(optionalNumber('abc'))).toBe(true);
  });
});
