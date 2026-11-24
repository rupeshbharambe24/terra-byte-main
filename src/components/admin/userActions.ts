import type { StatusAction } from '@/lib/api';
import type { AdminUser } from '@/lib/types';

/** Actions an admin may take on a user, mirroring the API's allowed transitions. */
export function availableActions(user: Pick<AdminUser, 'role' | 'status'>): StatusAction[] {
  if (user.role === 'admin') return [];
  switch (user.status) {
    case 'pending':
      return ['approve', 'reject'];
    case 'approved':
      return ['suspend'];
    case 'rejected':
    case 'suspended':
      return ['approve'];
    default:
      return [];
  }
}
