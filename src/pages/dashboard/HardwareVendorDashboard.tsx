
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';

const HardwareVendorDashboard: React.FC = () => {
  const { user } = useAuth();

  const vendorCards = [
    {
      title: 'Equipment List',
      description: 'Manage your equipment inventory',
      icon: '🚜',
      path: '/hardware-equipment',
      count: '15 machines'
    },
    {
      title: 'Rental Requests',
      description: 'View and manage rental requests',
      icon: '📋',
      path: '/hardware-rentals',
      count: '8 pending'
    },
    {
      title: 'Calendar',
      description: 'Schedule and bookings',
      icon: '📅',
      path: '/hardware-calendar',
      count: '12 bookings'
    },
    {
      title: 'Reviews',
      description: 'Customer feedback and ratings',
      icon: '⭐',
      path: '/hardware-reviews',
      count: '4.6 rating'
    }
  ];

  const recentRentals = [
    {
      id: 'RNT-001',
      farmer: 'Rajesh Kumar',
      equipment: 'Tractor - John Deere 5075E',
      duration: '3 days',
      amount: '₹4,500',
      status: 'active',
      startDate: 'Today'
    },
    {
      id: 'RNT-002',
      farmer: 'Priya Sharma',
      equipment: 'Harvester - Case IH 2000',
      duration: '2 days',
      amount: '₹8,000',
      status: 'pending',
      startDate: 'Tomorrow'
    },
    {
      id: 'RNT-003',
      farmer: 'Suresh Patel',
      equipment: 'Sprayer - Field King',
      duration: '1 day',
      amount: '₹1,200',
      status: 'completed',
      startDate: '2 days ago'
    }
  ];

  const stats = [
    { label: 'Total Revenue', value: '₹1.8L', trend: '+22%' },
    { label: 'Equipment Utilization', value: '78%', trend: '+8%' },
    { label: 'Active Rentals', value: '12', trend: '+15%' },
    { label: 'Customer Rating', value: '4.6', trend: '+0.3' }
  ];

  const equipmentStatus = [
    { name: 'Tractor - JD 5075E', status: 'rented', nextAvailable: 'Dec 28' },
    { name: 'Harvester - Case IH', status: 'available', nextAvailable: 'Available now' },
    { name: 'Sprayer - Field King', status: 'maintenance', nextAvailable: 'Dec 30' },
    { name: 'Plough - Lemken', status: 'available', nextAvailable: 'Available now' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hardware Vendor Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your agricultural equipment rentals.
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
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                  {card.count}
                </p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Rentals */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Rentals</h2>
                <Link
                  to="/hardware-rentals"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {recentRentals.map((rental, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">#{rental.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rental.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                          : rental.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        {rental.status}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{rental.farmer}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{rental.equipment}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{rental.duration} • {rental.startDate}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{rental.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Equipment Status</h2>
              <div className="space-y-4">
                {equipmentStatus.map((equipment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{equipment.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{equipment.nextAvailable}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      equipment.status === 'available' 
                        ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                        : equipment.status === 'rented'
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300'
                    }`}>
                      {equipment.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HardwareVendorDashboard;
