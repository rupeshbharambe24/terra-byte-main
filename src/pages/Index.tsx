
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Index: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard based on user role
    const dashboardRoutes = {
      admin: '/admin-dashboard',
      farmer: '/farmer-dashboard',
      expert: '/expert-dashboard',
      agri_vendor: '/vendor-dashboard',
      hardware_vendor: '/hardware-vendor-dashboard'
    };
    
    return <Navigate to={dashboardRoutes[user.role as keyof typeof dashboardRoutes]} replace />;
  }

  // Redirect to landing page for non-authenticated users
  return <Navigate to="/landing" replace />;
};

export default Index;
