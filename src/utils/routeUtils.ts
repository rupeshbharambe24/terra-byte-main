
export const getDashboardRoute = (role?: string): string => {
  switch (role) {
    case 'admin': return '/admin-dashboard';
    case 'farmer': return '/farmer-dashboard';
    case 'expert': return '/expert-dashboard';
    case 'agri_vendor': return '/vendor-dashboard';
    case 'hardware_vendor': return '/hardware-vendor-dashboard';
    default: return '/';
  }
};
