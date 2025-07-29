import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  loadingFallback?: React.ReactNode;
  unauthenticatedRedirect?: string;
  unauthorizedRedirect?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  loadingFallback = <div>Loading...</div>,
  unauthenticatedRedirect = '/login',
  unauthorizedRedirect = '/unauthorized'
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading state while auth status is being determined
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={unauthenticatedRedirect} replace />;
  }

  // Check role requirements if specified
  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  // If all checks pass, render the children
  return <>{children}</>;
};

export default ProtectedRoute;