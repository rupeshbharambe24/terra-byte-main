
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const Notifications: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filters = ['All', 'Weather', 'Irrigation', 'Market', 'System', 'Alerts'];

  const notifications = [
    {
      id: 1,
      type: 'Weather',
      title: 'Heavy Rain Alert',
      message: 'Heavy rainfall expected in your area for the next 3 days. Consider covering sensitive crops.',
      time: '5 minutes ago',
      isRead: false,
      priority: 'high',
      icon: '🌧️'
    },
    {
      id: 2,
      type: 'Irrigation',
      title: 'Irrigation Schedule Reminder',
      message: 'Scheduled irrigation for Field A will start in 30 minutes. Ensure water supply is available.',
      time: '1 hour ago',
      isRead: false,
      priority: 'medium',
      icon: '💧'
    },
    {
      id: 3,
      type: 'Market',
      title: 'Price Alert - Rice',
      message: 'Rice prices have increased by 3.2% today. Current price: ₹2,050/quintal. Good time to sell.',
      time: '2 hours ago',
      isRead: true,
      priority: 'medium',
      icon: '💰'
    },
    {
      id: 4,
      type: 'System',
      title: 'Soil Sensor Update',
      message: 'Soil moisture sensor in Field C shows low readings (38%). Consider irrigation.',
      time: '3 hours ago',
      isRead: false,
      priority: 'high',
      icon: '📊'
    },
    {
      id: 5,
      type: 'Weather',
      title: 'Frost Warning',
      message: 'Temperature may drop below 5°C tonight. Protect your winter crops.',
      time: '4 hours ago',
      isRead: true,
      priority: 'high',
      icon: '❄️'
    },
    {
      id: 6,
      type: 'Market',
      title: 'Government Procurement Update',
      message: 'Government wheat procurement starts next week. MSP set at ₹2,125/quintal.',
      time: '6 hours ago',
      isRead: true,
      priority: 'low',
      icon: '🏛️'
    },
    {
      id: 7,
      type: 'Irrigation',
      title: 'Irrigation System Maintenance',
      message: 'Scheduled maintenance for irrigation system completed successfully. All zones operational.',
      time: '8 hours ago',
      isRead: true,
      priority: 'low',
      icon: '🔧'
    },
    {
      id: 8,
      type: 'Alerts',
      title: 'Disease Detection Alert',
      message: 'Possible early blight detected in tomato plants. Check your crops and apply treatment if needed.',
      time: '12 hours ago',
      isRead: false,
      priority: 'high',
      icon: '🔬'
    },
    {
      id: 9,
      type: 'System',
      title: 'Equipment Rental Approved',
      message: 'Your request for John Deere tractor rental has been approved for Jan 22-24.',
      time: '1 day ago',
      isRead: true,
      priority: 'medium',
      icon: '🚜'
    },
    {
      id: 10,
      type: 'Weather',
      title: 'Sunny Weather Forecast',
      message: 'Clear skies expected for the next 5 days. Perfect for harvesting activities.',
      time: '1 day ago',
      isRead: true,
      priority: 'low',
      icon: '☀️'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900';
      case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-900';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const filteredNotifications = notifications.filter(notification => 
    selectedFilter === 'All' || notification.type === selectedFilter
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-3 px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Weather alerts, irrigation reminders, market updates, and system notifications.
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Mark All Read
                </Button>
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  variant={selectedFilter === filter ? "default" : "outline"}
                  size="sm"
                >
                  {filter}
                  {filter === 'All' && ` (${notifications.length})`}
                  {filter !== 'All' && ` (${notifications.filter(n => n.type === filter).length})`}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <span className="text-2xl">⚙️</span>
                  <span className="text-sm">Notification Settings</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <span className="text-2xl">🔔</span>
                  <span className="text-sm">Create Alert</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <span className="text-2xl">📱</span>
                  <span className="text-sm">Mobile Alerts</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <span className="text-2xl">📊</span>
                  <span className="text-sm">Alert History</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Recent Notifications ({filteredNotifications.length})
                {selectedFilter !== 'All' && ` - ${selectedFilter}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-l-4 p-4 rounded-lg transition-all hover:shadow-md ${getPriorityColor(notification.priority)} ${
                      notification.isRead ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl">{notification.icon}</span>
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-semibold ${notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {notification.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadgeColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                        </div>
                        <p className={`mb-2 ${notification.isRead ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {notification.time}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            notification.type === 'Weather' ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' :
                            notification.type === 'Market' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' :
                            notification.type === 'Irrigation' ? 'bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300' :
                            notification.type === 'System' ? 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300' :
                            'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300'
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!notification.isRead && (
                          <Button variant="outline" size="sm">
                            Mark Read
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          ⋯
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notification Types</h3>
                  <div className="space-y-3">
                    {['Weather Alerts', 'Irrigation Reminders', 'Market Updates', 'System Notifications', 'Disease Alerts'].map((type) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{type}</span>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Delivery Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quiet Hours
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="time"
                          defaultValue="22:00"
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                        <span className="flex items-center text-gray-600 dark:text-gray-400">to</span>
                        <input
                          type="time"
                          defaultValue="06:00"
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Summary Frequency
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Never</option>
                      </select>
                    </div>
                    
                    <Button className="w-full">
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Notifications;
