
import React from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { Brain, Zap, Target, TrendingUp } from 'lucide-react';

const AIModelPerformance: React.FC = () => {
  const modelPerformance = [
    { model: 'Crop Disease Detection', accuracy: 95.2, status: 'active', requests: 1240, responseTime: 450 },
    { model: 'Soil Analysis', accuracy: 92.8, status: 'active', requests: 890, responseTime: 320 },
    { model: 'Weather Prediction', accuracy: 88.5, status: 'active', requests: 2340, responseTime: 180 },
    { model: 'Price Forecasting', accuracy: 91.3, status: 'active', requests: 560, responseTime: 290 },
    { model: 'Pest Identification', accuracy: 94.1, status: 'training', requests: 340, responseTime: 520 },
    { model: 'Yield Prediction', accuracy: 89.7, status: 'active', requests: 780, responseTime: 380 }
  ];

  const accuracyTrend = [
    { date: 'May 20', cropDisease: 94.8, soilAnalysis: 91.5, weather: 87.2, price: 90.1 },
    { date: 'May 21', cropDisease: 95.1, soilAnalysis: 92.1, weather: 87.8, price: 90.8 },
    { date: 'May 22', cropDisease: 94.9, soilAnalysis: 92.3, weather: 88.1, price: 91.2 },
    { date: 'May 23', cropDisease: 95.0, soilAnalysis: 92.6, weather: 88.3, price: 91.0 },
    { date: 'May 24', cropDisease: 95.2, soilAnalysis: 92.8, weather: 88.5, price: 91.3 },
    { date: 'May 25', cropDisease: 95.1, soilAnalysis: 92.7, weather: 88.4, price: 91.1 }
  ];

  const usageData = [
    { hour: '00:00', requests: 45 },
    { hour: '04:00', requests: 23 },
    { hour: '08:00', requests: 234 },
    { hour: '12:00', requests: 445 },
    { hour: '16:00', requests: 367 },
    { hour: '20:00', requests: 198 }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'training':
        return <Badge className="bg-blue-100 text-blue-800">Training</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'text-green-600';
    if (accuracy >= 90) return 'text-blue-600';
    if (accuracy >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const stats = [
    { label: 'Total Models', value: '6', icon: Brain, color: 'text-blue-600' },
    { label: 'Active Models', value: '5', icon: Zap, color: 'text-green-600' },
    { label: 'Avg Accuracy', value: '92.1%', icon: Target, color: 'text-purple-600' },
    { label: 'Daily Requests', value: '5.2K', icon: TrendingUp, color: 'text-orange-600' }
  ];

  const chartConfig = {
    cropDisease: { label: 'Crop Disease', color: '#22C55E' },
    soilAnalysis: { label: 'Soil Analysis', color: '#3B82F6' },
    weather: { label: 'Weather', color: '#8B5CF6' },
    price: { label: 'Price Forecast', color: '#F59E0B' }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Model Performance
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor and analyze AI model performance across the platform.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      </div>
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Model Performance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {modelPerformance.map((model, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{model.model}</CardTitle>
                    {getStatusBadge(model.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy</span>
                      <span className={`text-2xl font-bold ${getAccuracyColor(model.accuracy)}`}>
                        {model.accuracy}%
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Daily Requests</span>
                        <span className="font-medium">{model.requests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Avg Response Time</span>
                        <span className="font-medium">{model.responseTime}ms</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${model.accuracy}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Model Accuracy Trend</CardTitle>
                <CardDescription>Daily accuracy performance over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                  <LineChart data={accuracyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[85, 96]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="cropDisease" stroke="var(--color-cropDisease)" strokeWidth={2} />
                    <Line type="monotone" dataKey="soilAnalysis" stroke="var(--color-soilAnalysis)" strokeWidth={2} />
                    <Line type="monotone" dataKey="weather" stroke="var(--color-weather)" strokeWidth={2} />
                    <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Usage Pattern */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Usage Pattern</CardTitle>
                <CardDescription>AI model requests throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <ChartTooltip />
                      <Bar dataKey="requests" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIModelPerformance;
