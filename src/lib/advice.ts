// Pure helpers for consultations, the KVK directory and knowledge articles.
import { MAHARASHTRA_DISTRICTS } from './constants';
import type { Consultation, Role } from './types';

export interface ThreadPermissions {
  canClaim: boolean;
  canReply: boolean;
  canMarkAnswered: boolean;
  canClose: boolean;
  canReassign: boolean;
}

/** What the viewer may do on a consultation. Mirrors the API rules (which re-check everything). */
export function threadPermissions(
  viewer: { id: number; role: Role } | null | undefined,
  c: Pick<Consultation, 'farmer_id' | 'expert_id' | 'status'>
): ThreadPermissions {
  const none: ThreadPermissions = {
    canClaim: false,
    canReply: false,
    canMarkAnswered: false,
    canClose: false,
    canReassign: false,
  };
  if (!viewer || c.status === 'closed') return none;
  const isFarmer = viewer.role === 'farmer' && viewer.id === c.farmer_id;
  const isAssignedExpert = viewer.role === 'expert' && c.expert_id === viewer.id;
  return {
    canClaim: viewer.role === 'expert' && c.expert_id === null && c.status === 'open',
    canReply: isFarmer || isAssignedExpert,
    canMarkAnswered: isAssignedExpert && c.status === 'assigned',
    canClose: isFarmer || isAssignedExpert || viewer.role === 'admin',
    canReassign: viewer.role === 'admin',
  };
}

/** Split plain text into paragraphs (rendered as text nodes, never as HTML). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Maharashtra districts not yet covered by any KVK in the directory (case-insensitive). */
export function missingDistricts(covered: string[]): string[] {
  const have = new Set(covered.map((d) => d.trim().toLowerCase()));
  return MAHARASHTRA_DISTRICTS.filter((d) => !have.has(d.toLowerCase()));
}

/** Blank strings become null so optional fields are cleared rather than stored as "". */
export function blankToNull(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}

/** Parse an optional decimal input ("" -> null, invalid -> NaN so the form can flag it). */
export function optionalNumber(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  return Number(v);
}

export const PINCODE_RE = /^[1-9]\d{5}$/;
