
import React, { useState } from 'react';
import { Play, Pause, Settings, Camera, BarChart3, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';

const PrecisionFertilizer: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [fertilizerMode, setFertilizerMode] = useState<'fixed' | 'smart'>('fixed');
  const [showVideo, setShowVideo] = useState(false);
  const [fixedDistance, setFixedDistance] = useState('50');
  const [progress, setProgress] = useState(35);

  const handleStartStop = () => {
    setIsActive(!isActive);
  };

  const toggleVideo = () => {
    setShowVideo(!showVideo);
  };

  const stats = {
    plantsCompleted: 245,
    plantsRemaining: 455,
    fertilizerUsed: '12.5L',
    efficiency: '94%',
    timeElapsed: '2h 15m',
    estimatedCompletion: '4h 30m'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🤖 Precision Fertilizer System
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              AI-powered robotic fertilization with real-time monitoring
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Control Panel</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mode Selection */}
                  <div>
                    <Label htmlFor="mode">Fertilization Mode</Label>
                    <Select value={fertilizerMode} onValueChange={(value: 'fixed' | 'smart') => setFertilizerMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">
                          <div className="flex flex-col">
                            <span>Fixed Distance</span>
                            <span className="text-xs text-gray-500">Quick but uses more fertilizer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="smart">
                          <div className="flex flex-col">
                            <span>Smart Detection</span>
                            <span className="text-xs text-gray-500">Precise but slower</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fixed Distance Input */}
                  {fertilizerMode === 'fixed' && (
                    <div>
                      <Label htmlFor="distance">Distance Between Sprays (cm)</Label>
                      <Input
                        id="distance"
                        type="number"
                        value={fixedDistance}
                        onChange={(e) => setFixedDistance(e.target.value)}
                        placeholder="50"
                      />
                    </div>
                  )}

                  {/* Start/Stop Button */}
                  <Button
                    onClick={handleStartStop}
                    className={`w-full ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    size="lg"
                  >
                    {isActive ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Stop Fertilization
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start Fertilization
                      </>
                    )}
                  </Button>

                  {/* Video Toggle */}
                  <Button
                    onClick={toggleVideo}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    {showVideo ? 'Hide' : 'Show'} Robot Camera
                  </Button>

                  {/* System Status */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">System Status</span>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Active' : 'Standby'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Battery Level:</span>
                        <span>87%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tank Level:</span>
                        <span>75%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GPS Signal:</span>
                        <span className="text-green-600">Strong</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Display */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Feed */}
              {showVideo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Camera className="w-5 h-5" />
                      <span>Live Robot Camera Feed</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Robot Camera Feed</p>
                          <p className="text-sm opacity-75">
                            {isActive ? 'Fertilization in progress...' : 'System on standby'}
                          </p>
                        </div>
                      </div>
                      {/* Overlay UI */}
                      <div className="absolute top-4 left-4 space-y-2">
                        <Badge className="bg-black bg-opacity-50 text-white">
                          {fertilizerMode === 'fixed' ? 'Fixed Distance Mode' : 'Smart Detection Mode'}
                        </Badge>
                        <Badge className="bg-black bg-opacity-50 text-white">
                          Field Position: Row 12, Column 15
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-red-600 animate-pulse">● LIVE</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Progress and Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Progress Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Progress</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Field Coverage</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {stats.plantsCompleted}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Plants Fertilized
                          </div>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {stats.plantsRemaining}
                          </div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            Plants Remaining
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Fertilizer Used</span>
                        <span className="font-semibold">{stats.fertilizerUsed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Efficiency</span>
                        <Badge variant="default" className="bg-green-600">
                          {stats.efficiency}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Time Elapsed</span>
                        <span className="font-semibold">{stats.timeElapsed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Est. Completion</span>
                        <span className="font-semibold">{stats.estimatedCompletion}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mode Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Mode: {fertilizerMode === 'fixed' ? 'Fixed Distance' : 'Smart Detection'}</CardTitle>
                  <CardDescription>
                    {fertilizerMode === 'fixed' 
                      ? 'Robot moves in a grid pattern spraying every ' + fixedDistance + 'cm. Quick but may use more fertilizer.'
                      : 'Robot uses AI to detect individual plants and fertilizes only when crops are identified. More precise but slower.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600 dark:text-green-400">Advantages</h4>
                      <ul className="text-sm space-y-1">
                        {fertilizerMode === 'fixed' ? (
                          <>
                            <li>• Faster coverage</li>
                            <li>• Predictable timing</li>
                            <li>• Simple operation</li>
                          </>
                        ) : (
                          <>
                            <li>• Precise application</li>
                            <li>• Reduced waste</li>
                            <li>• Better crop health</li>
                          </>
                        )}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-orange-600 dark:text-orange-400">Considerations</h4>
                      <ul className="text-sm space-y-1">
                        {fertilizerMode === 'fixed' ? (
                          <>
                            <li>• May over-fertilize areas</li>
                            <li>• Higher fertilizer usage</li>
                            <li>• Less precision</li>
                          </>
                        ) : (
                          <>
                            <li>• Slower operation</li>
                            <li>• Weather dependent</li>
                            <li>• Complex AI processing</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrecisionFertilizer;