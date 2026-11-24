import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface MarketPrice {
  crop: string;
  currentPrice: number;
  msp?: number;
  change: string;
  trend: string;
  market: string;
}

interface ForecastData {
  predicted: number;
  confidence: number;
  factors: string[];
}

interface PriceHistory {
  month: string;
  price: number;
}

interface CurrentPrice {
  crop: string;
  currentPrice: number;
  msp?: number;
  change: string;
  trend: string;
  market: string;
}

interface ApiPrediction {
  commodity: string;
  start_date: string;
  predictions: {
    date: string;
    price: number;
  }[];
}

const PriceForecast: React.FC = () => {
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [selectedPeriod, setSelectedPeriod] = useState('3 months');
  const [selectedVegetable, setSelectedVegetable] = useState('tomato');
  const [forecastDate, setForecastDate] = useState<string>('');
  const [apiForecast, setApiForecast] = useState<ApiPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCommodities, setAvailableCommodities] = useState<string[]>([]);
  const [marketInput, setMarketInput] = useState('');
  const [currentMarketPrices, setCurrentMarketPrices] = useState<MarketPrice[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');

  // Fetch available commodities on component mount
  useEffect(() => {
    const fetchAvailableCommodities = async () => {
      try {
        const response = await fetch(apiUrl('/price-forecast/health'));
        if (!response.ok) {
          throw new Error('Failed to fetch available commodities');
        }
        const data = await response.json();
        setAvailableCommodities(data.loaded_models || []);
      } catch (err) {
        console.error('Error fetching available commodities:', err);
      }
    };

    fetchAvailableCommodities();
  }, []);

  const crops = ['Bhindi', 'Onion', 'Potato', 'Tomato'];
  const periods = ['1 month', '3 months', '6 months', '1 year'];
  const vegetables = ['bhindi', 'onion', 'potato', 'tomato'].filter(v => 
    availableCommodities.includes(v)
  );

  const currentPrices = [
    { crop: 'Rice', currentPrice: 2050, msp: 2040, change: '+2.3%', trend: 'up', market: 'Mumbai APMC' },
    { crop: 'Wheat', currentPrice: 2125, msp: 2125, change: '0%', trend: 'stable', market: 'Delhi APMC' },
    { crop: 'Cotton', currentPrice: 5800, msp: 5835, change: '-0.6%', trend: 'down', market: 'Ahmedabad APMC' },
    { crop: 'Sugarcane', currentPrice: 315, msp: 310, change: '+1.6%', trend: 'up', market: 'UP Sugar Mills' },
    { crop: 'Maize', currentPrice: 1870, msp: 1870, change: '0%', trend: 'stable', market: 'Hyderabad APMC' },
    { crop: 'Soybeans', currentPrice: 4200, msp: 4300, change: '-2.3%', trend: 'down', market: 'Indore APMC' }
  ];

  const priceHistory = {
    'Rice': [
      { month: 'Oct 2023', price: 1980 },
      { month: 'Nov 2023', price: 2010 },
      { month: 'Dec 2023', price: 2025 },
      { month: 'Jan 2024', price: 2050 }
    ],
    'Wheat': [
      { month: 'Oct 2023', price: 2100 },
      { month: 'Nov 2023', price: 2110 },
      { month: 'Dec 2023', price: 2120 },
      { month: 'Jan 2024', price: 2125 }
    ],
    'Cotton': [
      { month: 'Oct 2023', price: 5900 },
      { month: 'Nov 2023', price: 5850 },
      { month: 'Dec 2023', price: 5820 },
      { month: 'Jan 2024', price: 5800 }
    ]
  };

  const forecasts = {
    'Rice': {
      '1 month': { predicted: 2080, confidence: 92, factors: ['Monsoon season', 'Export demand', 'Government procurement'] },
      '3 months': { predicted: 2150, confidence: 87, factors: ['Festival season demand', 'Storage costs', 'International prices'] },
      '6 months': { predicted: 2200, confidence: 78, factors: ['New harvest season', 'Policy changes', 'Global trade'] },
      '1 year': { predicted: 2250, confidence: 65, factors: ['Climate change effects', 'Technology adoption', 'Market dynamics'] }
    },
    'Wheat': {
      '1 month': { predicted: 2140, confidence: 89, factors: ['Winter harvest', 'Storage availability', 'Transport costs'] },
      '3 months': { predicted: 2180, confidence: 84, factors: ['Quality grades', 'Export policies', 'Substitute crops'] },
      '6 months': { predicted: 2220, confidence: 76, factors: ['Monsoon impact', 'Input costs', 'Government schemes'] },
      '1 year': { predicted: 2280, confidence: 68, factors: ['Production trends', 'Consumer preferences', 'Technology'] }
    },
    'Cotton': {
      '1 month': { predicted: 5750, confidence: 85, factors: ['Textile demand', 'International prices', 'Quality factors'] },
      '3 months': { predicted: 5900, confidence: 80, factors: ['Export opportunities', 'Synthetic alternatives', 'Weather'] },
      '6 months': { predicted: 6000, confidence: 72, factors: ['Global cotton stocks', 'Trade policies', 'Currency rates'] },
      '1 year': { predicted: 6200, confidence: 60, factors: ['Climate patterns', 'Technology adoption', 'Market shifts'] }
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      case 'stable': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 dark:text-green-400';
    if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const fetchVegetableForecast = async () => {
    if (!forecastDate || !selectedVegetable) {
      setError('Please select both vegetable and date');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(apiUrl('/price-forecast'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commodity: selectedVegetable.toLowerCase(),
          date: forecastDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch forecast');
      }

    const data = await response.json();
      setApiForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast');
      console.error('Error fetching vegetable forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentForecast = forecasts[selectedCrop]?.[selectedPeriod];

    const fetchMarketPrices = async (market: string) => {
      setMarketLoading(true);
      setMarketError('');
      try {
        const response = await fetch(apiUrl(`/market-prices?market=${encodeURIComponent(market)}`));
        if (!response.ok) {
          throw new Error('Market not found');
        }
        const data = await response.json();
        setCurrentMarketPrices(data);
      } catch (err) {
        setMarketError(err instanceof Error ? err.message : 'Failed to fetch market data');
        setCurrentMarketPrices([]);
      } finally {
        setMarketLoading(false);
      }
    };

    const handleMarketSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (marketInput.trim()) {
        fetchMarketPrices(marketInput.trim());
      }
    };
    
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Price Forecast</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Market prices, MSP trends, and AI-powered price predictions for agricultural commodities.
            </p>
          </div>

          {/* Current Market Prices */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Market Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMarketSubmit} className="mb-6">
                <div className="flex gap-4">
                  <Input
                    type="text"
                    value={marketInput}
                    onChange={(e) => setMarketInput(e.target.value)}
                    placeholder="Enter market name (e.g., Mumbai, Delhi)"
                    className="w-[280px]"
                  />
                  <Button type="submit" disabled={marketLoading}>
                    {marketLoading ? 'Loading...' : 'Get Prices'}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Enter a market name to see available commodities and their current prices
                </p>
              </form>

              {marketError && <p className="text-red-600 dark:text-red-400 mb-4">{marketError}</p>}

              {marketLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}

              {!marketLoading && currentMarketPrices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentMarketPrices.map((item, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{item.crop}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.market}</p>
                        </div>
                        <span className={`text-xl ${getTrendColor(item.trend)}`}>
                          {getTrendIcon(item.trend)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Current Price:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">₹{item.currentPrice}/quintal</span>
                        </div>
                        {item.msp && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">MSP:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">₹{item.msp}/quintal</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Change:</span>
                          <span className={`font-semibold ${getTrendColor(item.trend)}`}>
                            {item.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!marketLoading && !currentMarketPrices.length && !marketInput && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Enter a market name to view current commodity prices</p>
                </div>
              )}

              {!marketLoading && !currentMarketPrices.length && marketInput && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No price data found for {marketInput}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Forecast Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Forecast Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Price Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Crop
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {crops.map((crop) => (
                        <Button
                          key={crop}
                          onClick={() => setSelectedVegetable(crop)}
                          variant={selectedVegetable === crop ? "default" : "outline"}
                          size="sm"
                        >
                          {crop}
                        </Button>
                      ))}
                    </div>
                  </div>
            
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Base Date (YYYY-MM-DD)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={forecastDate}
                        onChange={(e) => setForecastDate(e.target.value)}
                        placeholder="Select a date"
                      />
                      <Button onClick={fetchVegetableForecast} disabled={loading}>
                        {loading ? 'Loading...' : 'Get Forecast'}
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
                  </div>   


                  

                  {apiForecast && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        {apiForecast.commodity.charAt(0).toUpperCase() + apiForecast.commodity.slice(1)} - 15 Day Forecast
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {apiForecast.predictions.slice(0, 3).map((pred, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <div className="text-sm text-gray-600 dark:text-gray-400">{pred.date}</div>
                              <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                                ₹{pred.price.toFixed(2)}/quintal
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Predicted Price (₹/Quintal)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                              {apiForecast.predictions.map((pred, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {pred.date}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {pred.price.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price History */}
            <Card>
              <CardHeader>
                <CardTitle>Price History - {selectedCrop}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priceHistory[selectedCrop]?.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <span className="text-gray-600 dark:text-gray-400">{entry.month}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ₹{entry.price}/quintal
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Price Trend Analysis
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {selectedCrop} prices have shown a {selectedCrop === 'Rice' ? 'steady upward' : selectedCrop === 'Cotton' ? 'declining' : 'stable'} trend over the past 4 months.
                    {selectedCrop === 'Rice' && ' This is attributed to strong export demand and reduced production in key growing regions.'}
                    {selectedCrop === 'Cotton' && ' This decline is due to increased global supply and reduced textile demand.'}
                    {selectedCrop === 'Wheat' && ' Prices remain stable due to adequate government procurement and steady demand.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Insights */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Market Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Best Time to Sell</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <span className="text-green-800 dark:text-green-200">Rice</span>
                      <span className="font-semibold text-green-900 dark:text-green-100">Next 2-3 weeks</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                      <span className="text-yellow-800 dark:text-yellow-200">Cotton</span>
                      <span className="font-semibold text-yellow-900 dark:text-yellow-100">Wait 2-3 months</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                      <span className="text-blue-800 dark:text-blue-200">Wheat</span>
                      <span className="font-semibold text-blue-900 dark:text-blue-100">Current prices good</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Market Alerts</h3>
                  <div className="space-y-3">
                    <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-900">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        🎯 Rice prices expected to rise 3-4% in next month due to export contracts
                      </p>
                    </div>
                    <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Cotton market volatility expected due to international trade policies
                      </p>
                    </div>
                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        📊 Government procurement for wheat starts next week - good selling opportunity
                      </p>
                    </div>
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

export default PriceForecast;