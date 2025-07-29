
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';

const FarmerDashboard: React.FC = () => {
  const { user } = useAuth();

  const dashboardCards = [
    {
      title: 'Soil Monitoring',
      description: 'Real-time soil sensor data',
      icon: '🌱',
      path: '/soil-monitoring',
      stats: 'pH: 6.8, Moisture: 65%'
    },
    {
      title: 'Smart Irrigation',
      description: 'Control your irrigation system',
      icon: '💧',
      path: '/smart-irrigation',
      stats: 'Next: 2 hours'
    },
    {
      title: 'Weather Forecast',
      description: 'Weather and rain prediction',
      icon: '🌤️',
      path: '/weather-forecast',
      stats: '28°C, Partly Cloudy'
    },
    {
      title: 'Crop Planning',
      description: 'AI-powered crop planning',
      icon: '📊',
      path: '/crop-planning',
      stats: '5.2 acres planned'
    },
    {
      title: 'Disease Detection',
      description: 'Upload images for disease analysis',
      icon: '🔬',
      path: '/disease-detection',
      stats: 'No issues detected'
    },
    {
      title: 'Equipment Rentals',
      description: 'Rent farm equipment',
      icon: '🚜',
      path: '/equipment-rentals',
      stats: '12 available nearby'
    },
    {
      title: 'Marketplace',
      description: 'Buy seeds and fertilizers',
      icon: '🛒',
      path: '/marketplace',
      stats: 'New deals available'
    },
    {
      title: 'Price Forecast',
      description: 'Market prices and MSP trends',
      icon: '💰',
      path: '/price-forecast',
      stats: 'Rice: ₹2,050/quintal'
    }
  ];

  const recentActivities = [
    { action: 'Irrigation started for Field A', time: '2 hours ago', type: 'irrigation' },
    { action: 'Weather alert: Rain expected tomorrow', time: '4 hours ago', type: 'weather' },
    { action: 'New fertilizer recommendations available', time: '1 day ago', type: 'recommendation' },
    { action: 'Equipment rental request approved', time: '2 days ago', type: 'equipment' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Here's what's happening on your farm today.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Land</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">25.5 acres</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌾</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Crops</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">3 Types</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Water Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1,250L</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-800 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💧</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹45,000</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {dashboardCards.map((card, index) => (
              <Link
                key={index}
                to={card.path}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all transform hover:scale-105"
              >
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {card.description}
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  {card.stats}
                </p>
              </Link>
            ))}
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Activities</h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.type === 'irrigation' ? 'bg-blue-500' :
                    activity.type === 'weather' ? 'bg-yellow-500' :
                    activity.type === 'recommendation' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FarmerDashboard;
