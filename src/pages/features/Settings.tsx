
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'farm', name: 'Farm Details', icon: '🚜' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'preferences', name: 'Preferences', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your account settings and preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-xl">{tab.icon}</span>
                        <span className="font-medium">{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              {activeTab === 'profile' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                          <span className="text-3xl">👤</span>
                        </div>
                        <div>
                          <Button variant="outline" size="sm">
                            Change Photo
                          </Button>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            JPG, PNG or GIF. Max size 2MB.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            defaultValue={user?.name || ''}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            defaultValue={user?.email || ''}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            defaultValue="+91 98765 43210"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Location
                          </label>
                          <input
                            type="text"
                            defaultValue="Maharashtra, India"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Bio
                        </label>
                        <textarea
                          rows={4}
                          defaultValue="Experienced farmer with 15 years in sustainable agriculture. Specializing in rice, wheat, and organic farming techniques."
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'farm' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Farm Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Farm Name
                          </label>
                          <input
                            type="text"
                            defaultValue="Green Valley Farm"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Area (acres)
                          </label>
                          <input
                            type="number"
                            defaultValue="25.5"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Soil Type
                          </label>
                          <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                            <option>Loamy</option>
                            <option>Clay</option>
                            <option>Sandy</option>
                            <option>Silty</option>
                            <option>Mixed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Irrigation Type
                          </label>
                          <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                            <option>Drip Irrigation</option>
                            <option>Sprinkler</option>
                            <option>Surface Irrigation</option>
                            <option>Subsurface</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Primary Crops
                        </label>
                        <input
                          type="text"
                          defaultValue="Rice, Wheat, Cotton"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Separate multiple crops with commas"
                        />
                      </div>

                      <Button>Update Farm Details</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'preferences' && (
                <Card>
                  <CardHeader>
                    <CardTitle>App Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Dark Mode</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Switch between light and dark themes
                          </p>
                        </div>
                        <Button
                          onClick={toggleTheme}
                          variant={isDark ? "default" : "outline"}
                        >
                          {isDark ? '🌙 Dark' : '☀️ Light'}
                        </Button>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Language & Region</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Language
                            </label>
                            <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                              <option>English</option>
                              <option>Hindi</option>
                              <option>Marathi</option>
                              <option>Tamil</option>
                              <option>Telugu</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Timezone
                            </label>
                            <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                              <option>Asia/Kolkata (IST)</option>
                              <option>Asia/Mumbai (IST)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Units & Measurements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Area Unit
                            </label>
                            <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                              <option>Acres</option>
                              <option>Hectares</option>
                              <option>Square Meters</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Temperature Unit
                            </label>
                            <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                              <option>Celsius (°C)</option>
                              <option>Fahrenheit (°F)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <Button>Save Preferences</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Current Password
                            </label>
                            <input
                              type="password"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              New Password
                            </label>
                            <input
                              type="password"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <Button>Update Password</Button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-700 dark:text-gray-300">Secure your account with 2FA</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Currently disabled</p>
                          </div>
                          <Button variant="outline">Enable 2FA</Button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Current Device</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Chrome on Windows • Mumbai, India</p>
                            </div>
                            <span className="text-green-600 dark:text-green-400 text-sm">Active now</span>
                          </div>
                          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Mobile App</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Android • Mumbai, India</p>
                            </div>
                            <Button variant="outline" size="sm">Revoke</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'notifications' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Email Notifications</h3>
                        <div className="space-y-3">
                          {[
                            'Weather alerts and warnings',
                            'Irrigation reminders and schedules',
                            'Market price updates',
                            'Equipment rental confirmations',
                            'System maintenance notifications'
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-gray-700 dark:text-gray-300">{item}</span>
                              <input type="checkbox" defaultChecked className="w-4 h-4" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">SMS Notifications</h3>
                        <div className="space-y-3">
                          {[
                            'Critical weather alerts',
                            'Urgent irrigation alerts',
                            'Security notifications'
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-gray-700 dark:text-gray-300">{item}</span>
                              <input type="checkbox" defaultChecked className="w-4 h-4" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button>Save Notification Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
