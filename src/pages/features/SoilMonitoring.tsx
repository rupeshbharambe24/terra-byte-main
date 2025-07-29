
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';

const SoilMonitoring: React.FC = () => {
  const [selectedField, setSelectedField] = useState('Field A');

  const fieldData = {
    'Field A': {
      soilType: 'Loamy',
      lastUpdated: '2 minutes ago',
      sensors: [
        { id: 1, type: 'pH', value: 6.8, status: 'optimal', unit: '', range: '6.0-7.0' },
        { id: 2, type: 'Moisture', value: 45, status: 'low', unit: '%', range: '60-80%' },
        { id: 3, type: 'Temperature', value: 28, status: 'optimal', unit: '°C', range: '20-30°C' },
        { id: 4, type: 'Nitrogen', value: 85, status: 'high', unit: 'mg/kg', range: '40-80' },
        { id: 5, type: 'Phosphorus', value: 32, status: 'optimal', unit: 'mg/kg', range: '25-50' },
        { id: 6, type: 'Potassium', value: 180, status: 'optimal', unit: 'mg/kg', range: '150-250' },
        { id: 7, type: 'Organic Matter', value: 3.2, status: 'optimal', unit: '%', range: '2.5-5.0' },
        { id: 8, type: 'Salinity', value: 1.2, status: 'optimal', unit: 'dS/m', range: '0.0-2.0' }
      ]
    },
    'Field B': {
      soilType: 'Clay',
      lastUpdated: '5 minutes ago',
      sensors: [
        { id: 1, type: 'pH', value: 7.2, status: 'optimal', unit: '', range: '6.0-7.0' },
        { id: 2, type: 'Moisture', value: 72, status: 'optimal', unit: '%', range: '60-80%' },
        { id: 3, type: 'Temperature', value: 26, status: 'optimal', unit: '°C', range: '20-30°C' },
        { id: 4, type: 'Nitrogen', value: 65, status: 'optimal', unit: 'mg/kg', range: '40-80' },
        { id: 5, type: 'Phosphorus', value: 28, status: 'optimal', unit: 'mg/kg', range: '25-50' },
        { id: 6, type: 'Potassium', value: 195, status: 'optimal', unit: 'mg/kg', range: '150-250' },
        { id: 7, type: 'Organic Matter', value: 4.1, status: 'optimal', unit: '%', range: '2.5-5.0' },
        { id: 8, type: 'Salinity', value: 0.8, status: 'optimal', unit: 'dS/m', range: '0.0-2.0' }
      ]
    },
    'Field C': {
      soilType: 'Sandy',
      lastUpdated: '1 minute ago',
      sensors: [
        { id: 1, type: 'pH', value: 5.8, status: 'low', unit: '', range: '6.0-7.0' },
        { id: 2, type: 'Moisture', value: 38, status: 'low', unit: '%', range: '60-80%' },
        { id: 3, type: 'Temperature', value: 30, status: 'high', unit: '°C', range: '20-30°C' },
        { id: 4, type: 'Nitrogen', value: 25, status: 'low', unit: 'mg/kg', range: '40-80' },
        { id: 5, type: 'Phosphorus', value: 18, status: 'low', unit: 'mg/kg', range: '25-50' },
        { id: 6, type: 'Potassium', value: 120, status: 'low', unit: 'mg/kg', range: '150-250' },
        { id: 7, type: 'Organic Matter', value: 1.8, status: 'low', unit: '%', range: '2.5-5.0' },
        { id: 8, type: 'Salinity', value: 0.3, status: 'optimal', unit: 'dS/m', range: '0.0-2.0' }
      ]
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-800';
      case 'low': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const currentField = fieldData[selectedField];
  const criticalSensors = currentField.sensors.filter(sensor => sensor.status !== 'optimal');


  // State for generating fertilizer recommendation
  const [isGenerating, setIsGenerating] = useState(false);
  const [fertilizerRecommendation, setFertilizerRecommendation] = useState(null);
  const [userInputs, setUserInputs] = useState({
    cropType: '',
    temperature: '',
    humidity: '',
    moisture: ''
  });

  // Add this function to handle the API call
  const generateFertilizerRecommendation = async () => {
    setIsGenerating(true);
    try {
      // Combine field data with user inputs
      const requestData = {
        // Field sensor data
        field: selectedField,
        soilType: currentField.soilType,
        nitrogen: currentField.sensors.find(s => s.type === 'Nitrogen')?.value,
        phosphorus: currentField.sensors.find(s => s.type === 'Phosphorus')?.value,
        potassium: currentField.sensors.find(s => s.type === 'Potassium')?.value,
        pH: currentField.sensors.find(s => s.type === 'pH')?.value,
        organicMatter: currentField.sensors.find(s => s.type === 'Organic Matter')?.value,
        
        // User-provided data
        cropType: userInputs.cropType,
        temperature: userInputs.temperature || 25, // Default value if not provided
        humidity: userInputs.humidity || 50,     // Default value if not provided
        moisture: userInputs.moisture || 50      // Default value if not provided
      };

      const response = await fetch('http://localhost:5000/api/fertilizer-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }

      const data = await response.json();
      setFertilizerRecommendation(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Soil Monitoring</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Real-time soil sensor data and analytics for your fields.
            </p>
          </div>

          {/* Field Selector */}
          <div className="mb-6">
            <div className="flex space-x-4">
              {Object.keys(fieldData).map((field) => (
                <Button
                  key={field}
                  onClick={() => setSelectedField(field)}
                  variant={selectedField === field ? "default" : "outline"}
                  className="px-6 py-2"
                >
                  {field}
                </Button>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {criticalSensors.length > 0 && (
            <Alert className="mb-6 border-yellow-200 dark:border-yellow-800">
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                ⚠️ {criticalSensors.length} sensor(s) in {selectedField} require attention: {criticalSensors.map(s => s.type).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Field Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {selectedField} Overview
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  Last updated: {currentField.lastUpdated}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Soil Type</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{currentField.soilType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sensors</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{currentField.sensors.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className={`text-xl font-semibold ${criticalSensors.length === 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {criticalSensors.length === 0 ? 'All Systems Normal' : 'Requires Attention'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sensor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {currentField.sensors.map((sensor) => (
              <Card key={sensor.id} className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {sensor.type}
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(sensor.status)}`}>
                      {sensor.status}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {sensor.value}{sensor.unit}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Optimal: {sensor.range}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>


          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Fertilizer Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Get customized fertilizer suggestions based on {selectedField}'s soil conditions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Field</p>
                    <p className="text-lg font-semibold">{selectedField}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Soil Type</p>
                    <p className="text-lg font-semibold">{currentField.soilType}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Updated</p>
                    <p className="text-lg font-semibold">{currentField.lastUpdated}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Nitrogen', 'Phosphorus', 'Potassium'].map((nutrient) => {
                    const sensor = currentField.sensors.find(s => s.type === nutrient);
                    return (
                      <div 
                        key={nutrient} 
                        className={`border rounded-lg p-3 ${sensor?.status !== 'optimal' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                      >
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{nutrient} ({nutrient[0]})</p>
                        <p className="text-lg font-semibold">
                          {sensor?.value || 'N/A'} {sensor?.unit}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Optimal: {sensor?.range}
                        </p>
                        {sensor?.status !== 'optimal' && (
                          <p className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                            {sensor?.status} - needs adjustment
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>


                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold mb-3">Additional Information Needed</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Crop Type (Required)
                      </label>
                      <select
                        required
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        value={userInputs.cropType}
                        onChange={(e) => setUserInputs({...userInputs, cropType: e.target.value})}
                      >
                        <option value="">Select crop</option>
                        <option value="Wheat">Wheat</option>
                        <option value="Rice">Rice</option>
                        <option value="Corn">Corn</option>
                        <option value="Soybean">Soybean</option>
                        <option value="Cotton">Cotton</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Temperature (°C)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        placeholder="25"
                        value={userInputs.temperature}
                        onChange={(e) => setUserInputs({...userInputs, temperature: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Humidity (%)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        placeholder="50"
                        value={userInputs.humidity}
                        onChange={(e) => setUserInputs({...userInputs, humidity: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Moisture (%)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        placeholder="50"
                        value={userInputs.moisture}
                        onChange={(e) => setUserInputs({...userInputs, moisture: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4"
                  onClick={generateFertilizerRecommendation}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Generate Fertilizer Recommendation'
                  )}
                </Button>

                {fertilizerRecommendation && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Recommended Fertilizer</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300 mb-3">
                      {fertilizerRecommendation.fertilizerType || 'NPK 10-20-10'}
                    </p>

                    {/* Best For Section */}
                    {fertilizerRecommendation.explanation?.best_for && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Best For</h4>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">
                          {fertilizerRecommendation.explanation.best_for}
                        </p>
                      </div>
                    )}

                    {/* Key Benefits Section */}
                    {fertilizerRecommendation.explanation?.benefits && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Key Benefits</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300 mt-1">
                          {fertilizerRecommendation.explanation.benefits.map((benefit, index) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* When To Use Section */}
                    {fertilizerRecommendation.explanation?.when_to_use && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">When To Use</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300 mt-1">
                          {fertilizerRecommendation.explanation.when_to_use.map((condition, index) => (
                            <li key={index}>{condition}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Fertilizer Type Badge */}
                    {fertilizerRecommendation.explanation?.type && (
                      <div className="mt-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          fertilizerRecommendation.explanation.type === 'Organic' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : fertilizerRecommendation.explanation.type === 'Inorganic' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {fertilizerRecommendation.explanation.type}
                        </span>
                      </div>
                    )}

                    {/* Fallback Instructions (if no Gemini explanation) */}
                    {!fertilizerRecommendation.explanation && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">Application Instructions:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                          {[
                            `Apply ${fertilizerRecommendation.amount || '50kg'} per acre`,
                            'Split into 2 applications: 50% at planting, 50% after 30 days',
                            'Water thoroughly after application'
                          ].map((instruction, index) => (
                            <li key={index}>{instruction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {criticalSensors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations for {selectedField}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {criticalSensors.map((sensor) => (
                    <div key={sensor.id} className="border-l-4 border-yellow-400 dark:border-yellow-600 pl-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{sensor.type} - {sensor.status}</h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        {sensor.type === 'Moisture' && sensor.status === 'low' && 'Consider irrigation. Current moisture is below optimal range.'}
                        {sensor.type === 'pH' && sensor.status === 'low' && 'Apply lime to increase soil pH to optimal range.'}
                        {sensor.type === 'Nitrogen' && sensor.status === 'low' && 'Apply nitrogen-rich fertilizer to boost soil fertility.'}
                        {sensor.type === 'Temperature' && sensor.status === 'high' && 'Consider shade management or irrigation to cool soil.'}
                        {sensor.type === 'Nitrogen' && sensor.status === 'high' && 'Reduce nitrogen application to prevent nutrient burn.'}
                        {sensor.type === 'Phosphorus' && sensor.status === 'low' && 'Apply phosphorus fertilizer to improve root development.'}
                        {sensor.type === 'Potassium' && sensor.status === 'low' && 'Apply potassium fertilizer to enhance plant health.'}
                        {sensor.type === 'Organic Matter' && sensor.status === 'low' && 'Add compost or organic matter to improve soil structure.'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default SoilMonitoring;
