import type { Role } from '@/lib/types';

const DASHBOARDS: Record<Role, string> = {
  admin: '/admin-dashboard',
  farmer: '/farmer-dashboard',
  expert: '/expert-dashboard',
  vendor: '/vendor-dashboard',
  hardware_vendor: '/hardware-vendor-dashboard',
};

export const getDashboardRoute = (role?: Role | null): string => (role ? DASHBOARDS[role] ?? '/' : '/');
