import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Bug,
  Building2,
  CalendarDays,
  Cloud,
  Droplets,
  FlaskConical,
  Home,
  IndianRupee,
  Landmark,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Tractor,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  /** Key under common:sidebar.* */
  key: string;
  icon: LucideIcon;
  path: string;
}

const settings: NavItem = { key: 'settings', icon: Settings, path: '/settings' };
const notifications: NavItem = { key: 'notifications', icon: Bell, path: '/notifications' };

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  farmer: [
    { key: 'dashboard', icon: Home, path: '/farmer-dashboard' },
    { key: 'soilFertilizer', icon: FlaskConical, path: '/soil-fertilizer' },
    { key: 'smartIrrigation', icon: Droplets, path: '/smart-irrigation' },
    { key: 'weatherForecast', icon: Cloud, path: '/weather-forecast' },
    { key: 'cropPlanning', icon: Sprout, path: '/crop-planning' },
    { key: 'diseaseDetection', icon: Bug, path: '/disease-detection' },
    { key: 'marketplace', icon: ShoppingCart, path: '/marketplace' },
    { key: 'myOrders', icon: Receipt, path: '/orders' },
    { key: 'equipmentRentals', icon: Tractor, path: '/equipment-rentals' },
    { key: 'priceForecast', icon: TrendingUp, path: '/price-forecast' },
    { key: 'financialManagement', icon: IndianRupee, path: '/financial-management' },
    { key: 'governmentSchemes', icon: Landmark, path: '/government-schemes' },
    { key: 'kvkConsultation', icon: Building2, path: '/kvk-consultation' },
    { key: 'knowledge', icon: BookOpen, path: '/knowledge' },
    { key: 'forums', icon: MessageSquare, path: '/forums' },
    notifications,
    settings,
  ],
  vendor: [
    { key: 'dashboard', icon: Home, path: '/vendor-dashboard' },
    { key: 'products', icon: Package, path: '/vendor-products' },
    { key: 'orders', icon: ShoppingCart, path: '/vendor-orders' },
    { key: 'analytics', icon: TrendingUp, path: '/vendor-analytics' },
    notifications,
    settings,
  ],
  hardware_vendor: [
    { key: 'dashboard', icon: Home, path: '/hardware-vendor-dashboard' },
    { key: 'equipment', icon: Tractor, path: '/hardware-equipment' },
    { key: 'rentals', icon: BarChart3, path: '/hardware-rentals' },
    { key: 'calendar', icon: CalendarDays, path: '/hardware-calendar' },
    notifications,
    settings,
  ],
  admin: [
    { key: 'dashboard', icon: Home, path: '/admin-dashboard' },
    { key: 'userManagement', icon: Users, path: '/admin-users' },
    { key: 'vendorApprovals', icon: ShieldCheck, path: '/admin-vendor-approvals' },
    { key: 'systemAnalytics', icon: TrendingUp, path: '/admin-analytics' },
    { key: 'contentModeration', icon: ShieldCheck, path: '/admin-content' },
    { key: 'adminConsultations', icon: MessageSquare, path: '/admin-consultations' },
    { key: 'forums', icon: MessageSquare, path: '/forums' },
    { key: 'aiModelPerformance', icon: Bot, path: '/admin-ai-performance' },
    { key: 'kvkIntegration', icon: Building2, path: '/admin-kvk-integration' },
    { key: 'kvkManagement', icon: Building2, path: '/admin-kvk-management' },
    notifications,
    settings,
  ],
  expert: [
    { key: 'dashboard', icon: Home, path: '/expert-dashboard' },
    { key: 'consultations', icon: MessageSquare, path: '/expert-consultations' },
    { key: 'knowledgeBase', icon: BookOpen, path: '/expert-knowledge' },
    { key: 'forums', icon: MessageSquare, path: '/forums' },
    notifications,
    settings,
  ],
};
