
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage all platform users',
      icon: '👥',
      path: '/admin-users',
      count: '1,245 users'
    },
    {
      title: 'Vendor Approvals',
      description: 'Review vendor applications',
      icon: '✅',
      path: '/admin-approvals',
      count: '12 pending'
    },
    {
      title: 'System Analytics',
      description: 'Platform usage statistics',
      icon: '📊',
      path: '/admin-stats',
      count: '98% uptime'
    },
    {
      title: 'Content Moderation',
      description: 'Moderate forums and content',
      icon: '🛡️',
      path: '/admin-moderation',
      count: '5 reports'
    },
    {
      title: 'KVK Integration',
      description: 'Manage KVK partnerships',
      icon: '🤝',
      path: '/admin-kvk',
      count: '150 centers'
    },
    {
      title: 'AI Model Performance',
      description: 'Monitor AI systems',
      icon: '🤖',
      path: '/admin-ai',
      count: '99.2% accuracy'
    }
  ];

  const systemStats = [
    { label: 'Total Farmers', value: '845', trend: '+12%' },
    { label: 'Active Sensors', value: '2,340', trend: '+5%' },
    { label: 'Daily Queries', value: '156', trend: '+8%' },
    { label: 'Equipment Rentals', value: '89', trend: '+15%' }
  ];

  const recentActions = [
    { action: 'New vendor approved: AgriSeeds Co.', time: '10 minutes ago', type: 'approval' },
    { action: 'System maintenance completed', time: '2 hours ago', type: 'system' },
    { action: 'Expert Dr. Sharma verified', time: '4 hours ago', type: 'verification' },
    { action: 'New KVK center added: Pune', time: '1 day ago', type: 'partnership' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and monitor the TerraByte platform.
            </p>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {systemStats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                    {stat.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Admin Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {adminCards.map((card, index) => (
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
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  {card.count}
                </p>
              </Link>
            ))}
          </div>

          {/* Recent Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Admin Actions</h2>
            <div className="space-y-4">
              {recentActions.map((action, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    action.type === 'approval' ? 'bg-green-500' :
                    action.type === 'system' ? 'bg-blue-500' :
                    action.type === 'verification' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">{action.action}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{action.time}</p>
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

export default AdminDashboard;
