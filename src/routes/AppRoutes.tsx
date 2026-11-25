import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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

const FarmerDashboard = lazy(() => import('@/pages/dashboard/FarmerDashboard'));
const VendorDashboard = lazy(() => import('@/pages/dashboard/VendorDashboard'));
const HardwareVendorDashboard = lazy(() => import('@/pages/dashboard/HardwareVendorDashboard'));
const AdminDashboard = lazy(() => import('@/pages/dashboard/AdminDashboard'));
const ExpertDashboard = lazy(() => import('@/pages/dashboard/ExpertDashboard'));

const SoilFertilizer = lazy(() => import('@/pages/features/SoilFertilizer'));
const WeatherForecast = lazy(() => import('@/pages/features/WeatherForecast'));
const SmartIrrigation = lazy(() => import('@/pages/features/SmartIrrigation'));
const CropPlanning = lazy(() => import('@/pages/features/CropPlanning'));
const DiseaseDetection = lazy(() => import('@/pages/features/DiseaseDetection'));
const EquipmentRentals = lazy(() => import('@/pages/features/EquipmentRentals'));
const Marketplace = lazy(() => import('@/pages/features/Marketplace'));
const PriceForecast = lazy(() => import('@/pages/features/PriceForecast'));
const GovernmentSchemes = lazy(() => import('@/pages/features/GovernmentSchemes'));
const KVKConsultation = lazy(() => import('@/pages/features/KVKConsultation'));
const Forums = lazy(() => import('@/pages/features/Forums'));
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

const MyOrders = lazy(() => import('@/pages/farmer/MyOrders'));
const OrderDetail = lazy(() => import('@/pages/farmer/OrderDetail'));
const Knowledge = lazy(() => import('@/pages/farmer/Knowledge'));
const ArticleView = lazy(() => import('@/pages/farmer/ArticleView'));
const ConsultationThread = lazy(() => import('@/pages/shared/ConsultationThread'));
const AdminConsultations = lazy(() => import('@/pages/admin/AdminConsultations'));
const ForumPost = lazy(() => import('@/pages/features/ForumPost'));

const ToSoilFertilizer: React.FC = () => <Navigate to="/soil-fertilizer" replace />;

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
  { path: '/farmer-dashboard', roles: ['farmer'], Component: FarmerDashboard },
  { path: '/soil-fertilizer', roles: ['farmer'], Component: SoilFertilizer },
  // Old links: soil monitoring and precision fertilizer are now one real feature.
  { path: '/soil-monitoring', roles: ['farmer'], Component: ToSoilFertilizer },
  { path: '/precision-fertilizer', roles: ['farmer'], Component: ToSoilFertilizer },
  { path: '/smart-irrigation', roles: ['farmer'], Component: SmartIrrigation },
  { path: '/weather-forecast', roles: ['farmer'], Component: WeatherForecast },
  { path: '/crop-planning', roles: ['farmer'], Component: CropPlanning },
  { path: '/disease-detection', roles: ['farmer'], Component: DiseaseDetection, demo: true },
  { path: '/equipment-rentals', roles: ['farmer'], Component: EquipmentRentals },
  { path: '/marketplace', roles: ['farmer', 'vendor'], Component: Marketplace },
  { path: '/orders', roles: ['farmer'], Component: MyOrders },
  { path: '/orders/:orderId', roles: ['farmer'], Component: OrderDetail },
  { path: '/price-forecast', roles: ['farmer'], Component: PriceForecast, demo: true },
  { path: '/financial-management', roles: ['farmer'], Component: FinancialManagement },
  { path: '/government-schemes', roles: ['farmer'], Component: GovernmentSchemes },
  { path: '/kvk-consultation', roles: ['farmer'], Component: KVKConsultation },
  { path: '/knowledge', roles: ['farmer', 'expert', 'admin'], Component: Knowledge },
  { path: '/knowledge/:articleId', roles: ['farmer', 'expert', 'admin'], Component: ArticleView },
  { path: '/consultations/:consultationId', roles: ['farmer', 'expert', 'admin'], Component: ConsultationThread },
  { path: '/forums', roles: ['farmer', 'expert', 'admin'], Component: Forums },
  { path: '/forums/:postId', roles: ['farmer', 'expert', 'admin'], Component: ForumPost },
  // Everyone
  { path: '/notifications', roles: ALL_ROLES, Component: Notifications },
  { path: '/settings', roles: ALL_ROLES, Component: Settings },
  // Vendor
  { path: '/vendor-dashboard', roles: ['vendor'], Component: VendorDashboard },
  { path: '/vendor-products', roles: ['vendor'], Component: VendorProducts },
  { path: '/vendor-orders', roles: ['vendor'], Component: VendorOrders },
  { path: '/vendor-analytics', roles: ['vendor'], Component: VendorAnalytics },
  // Hardware vendor
  { path: '/hardware-vendor-dashboard', roles: ['hardware_vendor'], Component: HardwareVendorDashboard },
  { path: '/hardware-equipment', roles: ['hardware_vendor'], Component: HardwareEquipment },
  { path: '/hardware-rentals', roles: ['hardware_vendor'], Component: HardwareRentals },
  { path: '/hardware-calendar', roles: ['hardware_vendor'], Component: HardwareCalendar },
  // Admin
  { path: '/admin-dashboard', roles: ['admin'], Component: AdminDashboard },
  { path: '/admin-users', roles: ['admin'], Component: AdminUsers },
  { path: '/admin-vendor-approvals', roles: ['admin'], Component: AdminVendorApprovals },
  { path: '/admin-analytics', roles: ['admin'], Component: AdminAnalytics },
  { path: '/admin-content', roles: ['admin'], Component: AdminContent },
  { path: '/admin-consultations', roles: ['admin'], Component: AdminConsultations },
  { path: '/admin-ai-performance', roles: ['admin'], Component: AdminAIPerformance },
  { path: '/admin-kvk-integration', roles: ['admin'], Component: AdminKVKIntegration },
  { path: '/admin-kvk-management', roles: ['admin'], Component: AdminKVKManagement },
  // Expert
  { path: '/expert-dashboard', roles: ['expert'], Component: ExpertDashboard },
  { path: '/expert-consultations', roles: ['expert'], Component: ExpertConsultations },
  { path: '/expert-knowledge', roles: ['expert'], Component: ExpertKnowledge },
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
