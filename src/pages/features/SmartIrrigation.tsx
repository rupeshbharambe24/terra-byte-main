
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';

const SmartIrrigation: React.FC = () => {
  const [irrigationStatus, setIrrigationStatus] = useState('stopped');
  const [scheduleTime, setScheduleTime] = useState('06:00');
  const [duration, setDuration] = useState('30');

  const sensorData = [
    { field: 'Field A', moisture: 45, temperature: 28, humidity: 65, status: 'needs_water' },
    { field: 'Field B', moisture: 72, temperature: 26, humidity: 70, status: 'optimal' },
    { field: 'Field C', moisture: 38, temperature: 30, humidity: 58, status: 'needs_water' },
    { field: 'Field D', moisture: 68, temperature: 27, humidity: 68, status: 'optimal' }
  ];

  const weatherForecast = [
    { day: 'Today', temp: '28°C', rain: '0%', icon: '☀️' },
    { day: 'Tomorrow', temp: '26°C', rain: '20%', icon: '⛅' },
    { day: 'Wed', temp: '24°C', rain: '80%', icon: '🌧️' },
    { day: 'Thu', temp: '25°C', rain: '10%', icon: '☀️' },
    { day: 'Fri', temp: '27°C', rain: '5%', icon: '☀️' }
  ];

  const handleIrrigationControl = (action: string) => {
    setIrrigationStatus(action);
    // In real app, this would call the irrigation API
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Irrigation</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor and control your irrigation system with AI-powered recommendations.
            </p>
          </div>

          {/* Irrigation Control */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Irrigation Control</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="text-center mb-6">
                  <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl ${
                    irrigationStatus === 'running' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {irrigationStatus === 'running' ? '💧' : '⭕'}
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
                    Status: {irrigationStatus === 'running' ? 'Running' : 'Stopped'}
                  </p>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => handleIrrigationControl('running')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Start Irrigation
                  </button>
                  <button
                    onClick={() => handleIrrigationControl('stopped')}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Stop Irrigation
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Irrigation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors">
                    Schedule Irrigation
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Data */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Real-time Sensor Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sensorData.map((sensor, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{sensor.field}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Moisture:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{sensor.moisture}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Temperature:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{sensor.temperature}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Humidity:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{sensor.humidity}%</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs text-center ${
                      sensor.status === 'optimal' 
                        ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {sensor.status === 'optimal' ? 'Optimal' : 'Needs Water'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Forecast */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Weather Forecast</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {weatherForecast.map((weather, index) => (
                <div key={index} className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{weather.day}</p>
                  <div className="text-3xl my-2">{weather.icon}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{weather.temp}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Rain: {weather.rain}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SmartIrrigation;
