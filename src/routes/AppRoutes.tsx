
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Public pages
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFound from '../pages/NotFound';

// Dashboards
import FarmerDashboard from '../pages/dashboard/FarmerDashboard';
import VendorDashboard from '../pages/dashboard/VendorDashboard';
import HardwareVendorDashboard from '../pages/dashboard/HardwareVendorDashboard';
import AdminDashboard from '../pages/dashboard/AdminDashboard';
import ExpertDashboard from '../pages/dashboard/ExpertDashboard';

// Feature pages
import SoilMonitoring from '../pages/features/SoilMonitoring';
import SmartIrrigation from '../pages/features/SmartIrrigation';
import CropPlanning from '../pages/features/CropPlanning';
import DiseaseDetection from '../pages/features/DiseaseDetection';
import EquipmentRentals from '../pages/features/EquipmentRentals';
import Marketplace from '../pages/features/Marketplace';
import PriceForecast from '../pages/features/PriceForecast';
import GovernmentSchemes from '../pages/features/GovernmentSchemes';
import KVKConsultation from '../pages/features/KVKConsultation';
import Forums from '../pages/features/Forums';
import PrecisionFertilizer from '../pages/features/PrecisionFertilizer';
import FinancialManagement from '../pages/features/FinancialManagement';
import Notifications from '../pages/features/Notifications';
import Settings from '../pages/features/Settings';

// Vendor Pages
import VendorProducts from '../pages/vendor/VendorProducts';
import VendorOrders from '../pages/vendor/VendorOrders';
import VendorAnalytics from '../pages/vendor/VendorAnalytics';

// Hardware Vendor Pages
import HardwareEquipment from '../pages/hardware/HardwareEquipment';
import HardwareRentals from '../pages/hardware/HardwareRentals';
import HardwareCalendar from '../pages/hardware/HardwareCalendar';

// Admin Pages
import AdminUsers from '../pages/admin/UserManagement';
import AdminVendorApprovals from '../pages/admin/VendorApprovals';
import AdminAnalytics from '../pages/admin/SystemAnalytics';
import AdminContent from '../pages/admin/ContentModeration';
import AdminAIPerformance from '../pages/admin/AIModelPerformance';
import AdminKVKIntegration from '../pages/admin/KVKIntegration';
import AdminKVKManagement from '../pages/admin/KVKManagement';

// Expert Pages
import ExpertConsultations from '../pages/expert/ExpertConsultations';
import ExpertKnowledge from '../pages/expert/ExpertKnowledge';

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route path="/farmer-dashboard" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <FarmerDashboard />
        </ProtectedRoute>
      } />

      {/* Feature pages - accessible by farmers */}
      <Route path="/soil-monitoring" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <SoilMonitoring />
        </ProtectedRoute>
      } />
      <Route path="/smart-irrigation" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <SmartIrrigation />
        </ProtectedRoute>
      } />
      <Route path="/crop-planning" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <CropPlanning />
        </ProtectedRoute>
      } />
      <Route path="/disease-detection" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <DiseaseDetection />
        </ProtectedRoute>
      } />
      <Route path="/equipment-rentals" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <EquipmentRentals />
        </ProtectedRoute>
      } />
      <Route path="/marketplace" element={
        <ProtectedRoute requiredRole={['farmer', 'agri_vendor']}>
          <Marketplace />
        </ProtectedRoute>
      } />
      <Route path="/price-forecast" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <PriceForecast />
        </ProtectedRoute>
      } />
      <Route path="/financial-management" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <FinancialManagement />
        </ProtectedRoute>
      } />
      <Route path="/government-schemes" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <GovernmentSchemes />
        </ProtectedRoute>
      } />
      <Route path="/kvk-consultation" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <KVKConsultation />
        </ProtectedRoute>
      } />
      <Route path="/forums" element={
        <ProtectedRoute requiredRole={['farmer', 'expert']}>
          <Forums />
        </ProtectedRoute>
      } />
      <Route path="/precision-fertilizer" element={
        <ProtectedRoute requiredRole={['farmer']}>
          <PrecisionFertilizer />
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute requiredRole={['farmer', 'agri_vendor', 'hardware_vendor', 'admin', 'expert']}>
          <Notifications />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute requiredRole={['farmer', 'agri_vendor', 'hardware_vendor', 'admin', 'expert']}>
          <Settings />
        </ProtectedRoute>
      } />

      {/* Vendor routes */}
      <Route path="/vendor-dashboard" element={
        <ProtectedRoute requiredRole={['agri_vendor']}>
          <VendorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/vendor-products" element={
        <ProtectedRoute requiredRole={['agri_vendor']}>
          <VendorProducts />
        </ProtectedRoute>
      } />
      <Route path="/vendor-orders" element={
        <ProtectedRoute requiredRole={['agri_vendor']}>
          <VendorOrders />
        </ProtectedRoute>
      } />
      <Route path="/vendor-analytics" element={
        <ProtectedRoute requiredRole={['agri_vendor']}>
          <VendorAnalytics />
        </ProtectedRoute>
      } />

      {/* Hardware Vendor routes */}
      <Route path="/hardware-vendor-dashboard" element={
        <ProtectedRoute requiredRole={['hardware_vendor']}>
          <HardwareVendorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/hardware-equipment" element={
        <ProtectedRoute requiredRole={['hardware_vendor']}>
          <HardwareEquipment />
        </ProtectedRoute>
      } />
      <Route path="/hardware-rentals" element={
        <ProtectedRoute requiredRole={['hardware_vendor']}>
          <HardwareRentals />
        </ProtectedRoute>
      } />
      <Route path="/hardware-calendar" element={
        <ProtectedRoute requiredRole={['hardware_vendor']}>
          <HardwareCalendar />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin-users" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin-vendor-approvals" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminVendorApprovals />
        </ProtectedRoute>
      } />
      <Route path="/admin-analytics" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminAnalytics />
        </ProtectedRoute>
      } />
      <Route path="/admin-content" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminContent />
        </ProtectedRoute>
      } />
      <Route path="/admin-ai-performance" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminAIPerformance />
        </ProtectedRoute>
      } />
      <Route path="/admin-kvk-integration" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminKVKIntegration />
        </ProtectedRoute>
      } />
      <Route path="/admin-kvk-management" element={
        <ProtectedRoute requiredRole={['admin']}>
          <AdminKVKManagement />
        </ProtectedRoute>
      } />

      {/* Expert routes */}
      <Route path="/expert-dashboard" element={
        <ProtectedRoute requiredRole={['expert']}>
          <ExpertDashboard />
        </ProtectedRoute>
      } />
      <Route path="/expert-consultations" element={
        <ProtectedRoute requiredRole={['expert']}>
          <ExpertConsultations />
        </ProtectedRoute>
      } />
      <Route path="/expert-knowledge" element={
        <ProtectedRoute requiredRole={['expert']}>
          <ExpertKnowledge />
        </ProtectedRoute>
      } />

      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;