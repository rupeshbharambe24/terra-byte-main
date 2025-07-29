
import React from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const VendorAnalytics: React.FC = () => {
  const salesData = [
    { month: 'Jan', sales: 65000, orders: 45 },
    { month: 'Feb', sales: 82000, orders: 58 },
    { month: 'Mar', sales: 78000, orders: 52 },
    { month: 'Apr', sales: 95000, orders: 67 },
    { month: 'May', sales: 110000, orders: 78 },
    { month: 'Jun', sales: 125000, orders: 89 }
  ];

  const productData = [
    { name: 'Fertilizers', value: 45, sales: 450000 },
    { name: 'Seeds', value: 30, sales: 280000 },
    { name: 'Tools', value: 15, sales: 180000 },
    { name: 'Pesticides', value: 10, sales: 120000 }
  ];

  const recentSales = [
    { product: 'Organic Fertilizer NPK', amount: 5000, date: '2024-01-15' },
    { product: 'Wheat Seeds Premium', amount: 1200, date: '2024-01-14' },
    { product: 'Bio Pesticide Neem', amount: 4250, date: '2024-01-13' },
    { product: 'Drip Irrigation Kit', amount: 15000, date: '2024-01-12' }
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sales Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your sales performance and business insights.
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹5.55L</p>
              <p className="text-green-600 text-sm">+18% from last month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">389</p>
              <p className="text-green-600 text-sm">+23% from last month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Order</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹1,428</p>
              <p className="text-blue-600 text-sm">+5% from last month</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Rating</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.8</p>
              <p className="text-green-600 text-sm">+0.2 from last month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Sales Trend */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Orders Overview */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Orders</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Performance */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Performance</h3>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {productData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {productData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index] }}
                      ></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ₹{(item.sales / 1000).toFixed(0)}K
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent High-Value Sales</h3>
              <div className="space-y-4">
                {recentSales.map((sale, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{sale.product}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{sale.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{sale.amount.toLocaleString()}</p>
                    </div>
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

export default VendorAnalytics;
