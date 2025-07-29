
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  Droplets, 
  Cloud, 
  Sprout, 
  Bug, 
  Tractor, 
  ShoppingCart, 
  TrendingUp, 
  MessageSquare, 
  Bell, 
  Settings,
  Building2,
  Bot,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const farmerMenuItems = [
    { name: 'Dashboard', icon: Home, path: '/farmer-dashboard' },
    { name: 'Soil Monitoring', icon: BarChart3, path: '/soil-monitoring' },
    { name: 'Smart Irrigation', icon: Droplets, path: '/smart-irrigation' },
    { name: 'Weather Forecast', icon: Cloud, path: '/weather-forecast' },
    { name: 'Crop Planning', icon: Sprout, path: '/crop-planning' },
    { name: 'Disease Detection', icon: Bug, path: '/disease-detection' },
    { name: 'Equipment Rentals', icon: Tractor, path: '/equipment-rentals' },
    { name: 'Marketplace', icon: ShoppingCart, path: '/marketplace' },
    { name: 'Price Forecast', icon: TrendingUp, path: '/price-forecast' },
    { name: 'Financial Management', icon: DollarSign, path: '/financial-management' },
    { name: 'Government Schemes', icon: Building2, path: '/government-schemes' },
    { name: 'KVK Consultation', icon: Building2, path: '/kvk-consultation' },
    { name: 'Forums', icon: MessageSquare, path: '/forums' },
    { name: 'Precision Fertilizer', icon: Sprout, path: '/precision-fertilizer' },
    { name: 'Notifications', icon: Bell, path: '/notifications' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const vendorMenuItems = [
    { name: 'Dashboard', icon: Home, path: '/vendor-dashboard' },
    { name: 'Products', icon: ShoppingCart, path: '/vendor-products' },
    { name: 'Orders', icon: BarChart3, path: '/vendor-orders' },
    { name: 'Analytics', icon: TrendingUp, path: '/vendor-analytics' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const hardwareVendorMenuItems = [
    { name: 'Dashboard', icon: Home, path: '/hardware-vendor-dashboard' },
    { name: 'Equipment', icon: Tractor, path: '/hardware-equipment' },
    { name: 'Rentals', icon: BarChart3, path: '/hardware-rentals' },
    { name: 'Calendar', icon: Cloud, path: '/hardware-calendar' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const adminMenuItems = [
    { name: 'Dashboard', icon: Home, path: '/admin-dashboard' },
    { name: 'User Management', icon: BarChart3, path: '/admin-users' },
    { name: 'Vendor Approvals', icon: ShoppingCart, path: '/admin-vendor-approvals' },
    { name: 'System Analytics', icon: TrendingUp, path: '/admin-analytics' },
    { name: 'Content Moderation', icon: MessageSquare, path: '/admin-content' },
    { name: 'AI Model Performance', icon: Bot, path: '/admin-ai-performance' },
    { name: 'KVK Integration', icon: Building2, path: '/admin-kvk-integration' },
    { name: 'KVK Management', icon: Building2, path: '/admin-kvk-management' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const expertMenuItems = [
    { name: 'Dashboard', icon: Home, path: '/expert-dashboard' },
    { name: 'Consultations', icon: MessageSquare, path: '/expert-consultations' },
    { name: 'Knowledge Base', icon: BarChart3, path: '/expert-knowledge' },
    { name: 'Forums', icon: MessageSquare, path: '/forums' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case 'farmer':
        return farmerMenuItems;
      case 'agri_vendor':
        return vendorMenuItems;
      case 'hardware_vendor':
        return hardwareVendorMenuItems;
      case 'admin':
        return adminMenuItems;
      case 'expert':
        return expertMenuItems;
      default:
        return farmerMenuItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">TerraByte</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'farmer'}</p>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;