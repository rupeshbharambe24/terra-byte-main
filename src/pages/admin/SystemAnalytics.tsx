
import React from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const SystemAnalytics: React.FC = () => {
  const userGrowthData = [
    { month: 'Jan', farmers: 120, vendors: 15, experts: 8 },
    { month: 'Feb', farmers: 180, vendors: 22, experts: 12 },
    { month: 'Mar', farmers: 250, vendors: 28, experts: 15 },
    { month: 'Apr', farmers: 320, vendors: 35, experts: 18 },
    { month: 'May', farmers: 410, vendors: 42, experts: 23 }
  ];

  const activityData = [
    { day: 'Mon', logins: 890, queries: 234, transactions: 45 },
    { day: 'Tue', logins: 1250, queries: 312, transactions: 67 },
    { day: 'Wed', logins: 1100, queries: 289, transactions: 52 },
    { day: 'Thu', logins: 1350, queries: 345, transactions: 78 },
    { day: 'Fri', logins: 1450, queries: 398, transactions: 89 },
    { day: 'Sat', logins: 890, queries: 234, transactions: 34 },
    { day: 'Sun', logins: 680, queries: 189, transactions: 23 }
  ];

  const userDistribution = [
    { name: 'Farmers', value: 68, color: '#22C55E' },
    { name: 'Vendors', value: 18, color: '#3B82F6' },
    { name: 'Experts', value: 12, color: '#8B5CF6' },
    { name: 'Admins', value: 2, color: '#F59E0B' }
  ];

  const systemMetrics = [
    { label: 'Total Users', value: '1,245', change: '+12%', trend: 'up' },
    { label: 'Daily Active Users', value: '892', change: '+8%', trend: 'up' },
    { label: 'System Uptime', value: '99.8%', change: '+0.2%', trend: 'up' },
    { label: 'Response Time', value: '245ms', change: '-15ms', trend: 'down' }
  ];

  const chartConfig = {
    farmers: { label: 'Farmers', color: '#22C55E' },
    vendors: { label: 'Vendors', color: '#3B82F6' },
    experts: { label: 'Experts', color: '#8B5CF6' },
    logins: { label: 'Logins', color: '#22C55E' },
    queries: { label: 'Queries', color: '#3B82F6' },
    transactions: { label: 'Transactions', color: '#8B5CF6' }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              System Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Platform usage and performance analytics.
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {systemMetrics.map((metric, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                    </div>
                    <div className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Monthly user registration by type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <BarChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="farmers" fill="var(--color-farmers)" />
                    <Bar dataKey="vendors" fill="var(--color-vendors)" />
                    <Bar dataKey="experts" fill="var(--color-experts)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Percentage of users by role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Daily platform activity metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="logins" stroke="var(--color-logins)" strokeWidth={2} />
                  <Line type="monotone" dataKey="queries" stroke="var(--color-queries)" strokeWidth={2} />
                  <Line type="monotone" dataKey="transactions" stroke="var(--color-transactions)" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default SystemAnalytics;
