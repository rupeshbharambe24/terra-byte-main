import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DemoBanner from '@/components/common/DemoBanner';
import PageSpinner from '@/components/common/PageSpinner';
import LandingPage from '@/pages/LandingPage';
import type { Role } from '@/lib/types';

// Every page except the landing page is code-split, so a farmer never downloads admin pages.
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const ComingSoon = lazy(() => import('@/pages/ComingSoon'));

const FarmerDashboard = lazy(() => import('@/pages/dashboard/FarmerDashboard'));
const VendorDashboard = lazy(() => import('@/pages/dashboard/VendorDashboard'));
const HardwareVendorDashboard = lazy(() => import('@/pages/dashboard/HardwareVendorDashboard'));
const AdminDashboard = lazy(() => import('@/pages/dashboard/AdminDashboard'));
const ExpertDashboard = lazy(() => import('@/pages/dashboard/ExpertDashboard'));

const SoilMonitoring = lazy(() => import('@/pages/features/SoilMonitoring'));
const SmartIrrigation = lazy(() => import('@/pages/features/SmartIrrigation'));
const CropPlanning = lazy(() => import('@/pages/features/CropPlanning'));
const DiseaseDetection = lazy(() => import('@/pages/features/DiseaseDetection'));
const EquipmentRentals = lazy(() => import('@/pages/features/EquipmentRentals'));
const Marketplace = lazy(() => import('@/pages/features/Marketplace'));
const PriceForecast = lazy(() => import('@/pages/features/PriceForecast'));
const GovernmentSchemes = lazy(() => import('@/pages/features/GovernmentSchemes'));
const KVKConsultation = lazy(() => import('@/pages/features/KVKConsultation'));
const Forums = lazy(() => import('@/pages/features/Forums'));
const PrecisionFertilizer = lazy(() => import('@/pages/features/PrecisionFertilizer'));
const FinancialManagement = lazy(() => import('@/pages/features/FinancialManagement'));
const Notifications = lazy(() => import('@/pages/features/Notifications'));
const Settings = lazy(() => import('@/pages/features/Settings'));

const VendorProducts = lazy(() => import('@/pages/vendor/VendorProducts'));
const VendorOrders = lazy(() => import('@/pages/vendor/VendorOrders'));
const VendorAnalytics = lazy(() => import('@/pages/vendor/VendorAnalytics'));

const HardwareEquipment = lazy(() => import('@/pages/hardware/HardwareEquipment'));
const HardwareRentals = lazy(() => import('@/pages/hardware/HardwareRentals'));
const HardwareCalendar = lazy(() => import('@/pages/hardware/HardwareCalendar'));

const AdminUsers = lazy(() => import('@/pages/admin/UserManagement'));
const AdminVendorApprovals = lazy(() => import('@/pages/admin/VendorApprovals'));
const AdminAnalytics = lazy(() => import('@/pages/admin/SystemAnalytics'));
const AdminContent = lazy(() => import('@/pages/admin/ContentModeration'));
const AdminAIPerformance = lazy(() => import('@/pages/admin/AIModelPerformance'));
const AdminKVKIntegration = lazy(() => import('@/pages/admin/KVKIntegration'));
const AdminKVKManagement = lazy(() => import('@/pages/admin/KVKManagement'));

const ExpertConsultations = lazy(() => import('@/pages/expert/ExpertConsultations'));
const ExpertKnowledge = lazy(() => import('@/pages/expert/ExpertKnowledge'));

const WeatherComingSoon: React.FC = () => <ComingSoon titleKey="weatherTitle" bodyKey="weatherBody" />;

interface AppRoute {
  path: string;
  roles: Role[];
  Component: React.ComponentType;
  /** Still shows placeholder data: render the "Demo data" banner. */
  demo?: boolean;
}

const ALL_ROLES: Role[] = ['farmer', 'vendor', 'hardware_vendor', 'admin', 'expert'];

const PROTECTED_ROUTES: AppRoute[] = [
  // Farmer
  { path: '/farmer-dashboard', roles: ['farmer'], Component: FarmerDashboard, demo: true },
  { path: '/soil-monitoring', roles: ['farmer'], Component: SoilMonitoring, demo: true },
  { path: '/smart-irrigation', roles: ['farmer'], Component: SmartIrrigation, demo: true },
  { path: '/weather-forecast', roles: ['farmer'], Component: WeatherComingSoon },
  { path: '/crop-planning', roles: ['farmer'], Component: CropPlanning, demo: true },
  { path: '/disease-detection', roles: ['farmer'], Component: DiseaseDetection, demo: true },
  { path: '/equipment-rentals', roles: ['farmer'], Component: EquipmentRentals, demo: true },
  { path: '/marketplace', roles: ['farmer', 'vendor'], Component: Marketplace, demo: true },
  { path: '/price-forecast', roles: ['farmer'], Component: PriceForecast, demo: true },
  { path: '/financial-management', roles: ['farmer'], Component: FinancialManagement, demo: true },
  { path: '/government-schemes', roles: ['farmer'], Component: GovernmentSchemes, demo: true },
  { path: '/kvk-consultation', roles: ['farmer'], Component: KVKConsultation, demo: true },
  { path: '/forums', roles: ['farmer', 'expert'], Component: Forums, demo: true },
  { path: '/precision-fertilizer', roles: ['farmer'], Component: PrecisionFertilizer, demo: true },
  // Everyone
  { path: '/notifications', roles: ALL_ROLES, Component: Notifications, demo: true },
  { path: '/settings', roles: ALL_ROLES, Component: Settings, demo: true },
  // Vendor
  { path: '/vendor-dashboard', roles: ['vendor'], Component: VendorDashboard, demo: true },
  { path: '/vendor-products', roles: ['vendor'], Component: VendorProducts, demo: true },
  { path: '/vendor-orders', roles: ['vendor'], Component: VendorOrders, demo: true },
  { path: '/vendor-analytics', roles: ['vendor'], Component: VendorAnalytics, demo: true },
  // Hardware vendor
  { path: '/hardware-vendor-dashboard', roles: ['hardware_vendor'], Component: HardwareVendorDashboard, demo: true },
  { path: '/hardware-equipment', roles: ['hardware_vendor'], Component: HardwareEquipment, demo: true },
  { path: '/hardware-rentals', roles: ['hardware_vendor'], Component: HardwareRentals, demo: true },
  { path: '/hardware-calendar', roles: ['hardware_vendor'], Component: HardwareCalendar, demo: true },
  // Admin
  { path: '/admin-dashboard', roles: ['admin'], Component: AdminDashboard, demo: true },
  { path: '/admin-users', roles: ['admin'], Component: AdminUsers },
  { path: '/admin-vendor-approvals', roles: ['admin'], Component: AdminVendorApprovals },
  { path: '/admin-analytics', roles: ['admin'], Component: AdminAnalytics, demo: true },
  { path: '/admin-content', roles: ['admin'], Component: AdminContent, demo: true },
  { path: '/admin-ai-performance', roles: ['admin'], Component: AdminAIPerformance, demo: true },
  { path: '/admin-kvk-integration', roles: ['admin'], Component: AdminKVKIntegration, demo: true },
  { path: '/admin-kvk-management', roles: ['admin'], Component: AdminKVKManagement, demo: true },
  // Expert
  { path: '/expert-dashboard', roles: ['expert'], Component: ExpertDashboard, demo: true },
  { path: '/expert-consultations', roles: ['expert'], Component: ExpertConsultations, demo: true },
  { path: '/expert-knowledge', roles: ['expert'], Component: ExpertKnowledge, demo: true },
];

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageSpinner />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {PROTECTED_ROUTES.map(({ path, roles, Component, demo }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute requiredRole={roles}>
              {demo && <DemoBanner />}
              <Component />
            </ProtectedRoute>
          }
        />
      ))}

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
