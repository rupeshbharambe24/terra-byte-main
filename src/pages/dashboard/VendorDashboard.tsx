
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';

const VendorDashboard: React.FC = () => {
  const { user } = useAuth();

  const vendorCards = [
    {
      title: 'My Products',
      description: 'Manage your product listings',
      icon: '📦',
      path: '/vendor-products',
      count: '45 products'
    },
    {
      title: 'Orders',
      description: 'View and manage orders',
      icon: '📋',
      path: '/vendor-orders',
      count: '12 pending'
    },
    {
      title: 'Inventory',
      description: 'Track stock levels',
      icon: '📊',
      path: '/vendor-inventory',
      count: '89% in stock'
    },
    {
      title: 'Analytics',
      description: 'Sales and performance data',
      icon: '📈',
      path: '/vendor-analytics',
      count: '₹2.5L this month'
    }
  ];

  const recentOrders = [
    {
      id: 'ORD-001',
      farmer: 'Rajesh Kumar',
      product: 'Organic Fertilizer (50kg)',
      amount: '₹2,500',
      status: 'pending',
      time: '2 hours ago'
    },
    {
      id: 'ORD-002',
      farmer: 'Priya Sharma',
      product: 'Wheat Seeds (10kg)',
      amount: '₹1,200',
      status: 'shipped',
      time: '1 day ago'
    },
    {
      id: 'ORD-003',
      farmer: 'Suresh Patel',
      product: 'NPK Fertilizer (25kg)',
      amount: '₹1,800',
      status: 'delivered',
      time: '2 days ago'
    }
  ];

  const stats = [
    { label: 'Total Sales', value: '₹4.2L', trend: '+18%' },
    { label: 'Orders', value: '156', trend: '+12%' },
    { label: 'Customers', value: '89', trend: '+25%' },
    { label: 'Rating', value: '4.8', trend: '+0.2' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Vendor Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your agricultural products and orders.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
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

          {/* Vendor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {vendorCards.map((card, index) => (
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

          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
              <Link
                to="/vendor-orders"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders.map((order, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">#{order.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'pending' 
                            ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                            : order.status === 'shipped'
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium">{order.farmer}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{order.product}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{order.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{order.amount}</p>
                      {order.status === 'pending' && (
                        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm mt-2 transition-colors">
                          Process
                        </button>
                      )}
                    </div>
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

export default VendorDashboard;
