
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const CropPlanning: React.FC = () => {
  const [selectedSeason, setSelectedSeason] = useState('Kharif');
  const [selectedField, setSelectedField] = useState('Field A');

  const seasonOptions = ['Kharif', 'Rabi', 'Zaid'];
  const fieldOptions = ['Field A', 'Field B', 'Field C'];

  const cropRecommendations = {
    'Kharif': [
      { name: 'Rice', suitability: 95, area: 8.5, expectedYield: '4.2 tons/ha', duration: '120-150 days', profitability: 'High' },
      { name: 'Cotton', suitability: 88, area: 6.0, expectedYield: '2.8 tons/ha', duration: '160-180 days', profitability: 'Medium' },
      { name: 'Sugarcane', suitability: 82, area: 4.5, expectedYield: '85 tons/ha', duration: '365 days', profitability: 'High' },
      { name: 'Maize', suitability: 78, area: 3.5, expectedYield: '6.5 tons/ha', duration: '90-120 days', profitability: 'Medium' }
    ],
    'Rabi': [
      { name: 'Wheat', suitability: 92, area: 10.0, expectedYield: '4.8 tons/ha', duration: '120-150 days', profitability: 'High' },
      { name: 'Barley', suitability: 85, area: 5.5, expectedYield: '3.2 tons/ha', duration: '120-140 days', profitability: 'Medium' },
      { name: 'Mustard', suitability: 80, area: 4.0, expectedYield: '1.8 tons/ha', duration: '120-140 days', profitability: 'Medium' },
      { name: 'Gram', suitability: 76, area: 3.0, expectedYield: '2.2 tons/ha', duration: '120-150 days', profitability: 'Medium' }
    ],
    'Zaid': [
      { name: 'Watermelon', suitability: 88, area: 2.5, expectedYield: '25 tons/ha', duration: '90-100 days', profitability: 'High' },
      { name: 'Cucumber', suitability: 85, area: 2.0, expectedYield: '18 tons/ha', duration: '60-70 days', profitability: 'Medium' },
      { name: 'Fodder Maize', suitability: 82, area: 4.0, expectedYield: '45 tons/ha', duration: '75-85 days', profitability: 'Low' },
      { name: 'Sunflower', suitability: 78, area: 3.5, expectedYield: '2.5 tons/ha', duration: '90-110 days', profitability: 'Medium' }
    ]
  };

  const currentPlans = [
    { field: 'Field A', crop: 'Rice', area: 8.5, status: 'Growing', daysLeft: 45 },
    { field: 'Field B', crop: 'Cotton', area: 6.0, status: 'Harvesting', daysLeft: 5 },
    { field: 'Field C', crop: 'Maize', area: 3.5, status: 'Planning', daysLeft: 15 }
  ];

  const getSuitabilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProfitabilityColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300';
      case 'Medium': return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'Low': return 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Crop Planning</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              AI-powered crop planning and recommendations based on your soil, weather, and market conditions.
            </p>
          </div>

          {/* Current Plans Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Crop Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {currentPlans.map((plan, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{plan.field}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Crop:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.crop}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Area:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.area} acres</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Days Left:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.daysLeft} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Season and Field Selector */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Season
                </label>
                <div className="flex space-x-2">
                  {seasonOptions.map((season) => (
                    <Button
                      key={season}
                      onClick={() => setSelectedSeason(season)}
                      variant={selectedSeason === season ? "default" : "outline"}
                      size="sm"
                    >
                      {season}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Field
                </label>
                <div className="flex space-x-2">
                  {fieldOptions.map((field) => (
                    <Button
                      key={field}
                      onClick={() => setSelectedField(field)}
                      variant={selectedField === field ? "default" : "outline"}
                      size="sm"
                    >
                      {field}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Crop Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>AI Crop Recommendations for {selectedSeason} Season - {selectedField}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cropRecommendations[selectedSeason].map((crop, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{crop.name}</h3>
                        <p className={`text-lg font-medium ${getSuitabilityColor(crop.suitability)}`}>
                          {crop.suitability}% Suitable
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${getProfitabilityColor(crop.profitability)}`}>
                        {crop.profitability} Profit
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Recommended Area</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{crop.area} acres</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Expected Yield</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{crop.expectedYield}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{crop.duration}</p>
                      </div>
                      <div>
                        <Button className="w-full" size="sm">
                          Plan Crop
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default CropPlanning;
