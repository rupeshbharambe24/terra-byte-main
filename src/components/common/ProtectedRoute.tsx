import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/lib/types';
import PageSpinner from './PageSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles allowed to open the page; any signed-in user if omitted. */
  requiredRole?: Role[];
}

/**
 * Client-side guard for navigation only. The API enforces roles on every request, so hiding a
 * page here is a convenience, not a security boundary.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
