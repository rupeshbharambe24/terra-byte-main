import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useAuth } from '../../context/AuthContext';

interface Detection {
  id: number;
  crop: string;
  disease: string;
  confidence: number;
  severity: string;
  date: string;
  status: string;
  image: string;
}

interface AnalysisResult {
  disease: string;
  confidence: number;
  severity: string;
  crop?: string;
  treatment: string[];
  prevention: string[];
}

const DiseaseDetection: React.FC = () => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock recent detections data
  const recentDetections: Detection[] = [
    {
      id: 1,
      crop: 'Tomato',
      disease: 'Early Blight',
      confidence: 92,
      severity: 'Medium',
      date: '2024-01-15',
      status: 'Treated',
      image: '/api/placeholder/150/150'
    },
    {
      id: 2,
      crop: 'Wheat',
      disease: 'Rust',
      confidence: 87,
      severity: 'High',
      date: '2024-01-14',
      status: 'Under Treatment',
      image: '/api/placeholder/150/150'
    },
    {
      id: 3,
      crop: 'Rice',
      disease: 'Bacterial Leaf Blight',
      confidence: 94,
      severity: 'Low',
      date: '2024-01-13',
      status: 'Monitoring',
      image: '/api/placeholder/150/150'
    }
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch('http://localhost:5000/api/disease/detect', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result = await response.json();
      setAnalysisResult(result);
      
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300';
      case 'Medium': return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'Low': return 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Treated': return 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300';
      case 'Under Treatment': return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'Monitoring': return 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300';
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Disease Detection</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Upload plant images for AI-powered disease detection and treatment recommendations.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Plant Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    {selectedImage ? (
                      <div className="space-y-4">
                        <img
                          src={selectedImage}
                          alt="Selected plant"
                          className="mx-auto max-h-64 rounded-lg"
                        />
                        <Button
                          onClick={() => {
                            setSelectedImage(null);
                            setImageFile(null);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-4">📸</div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Upload Plant Image
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Take a clear photo of the affected plant parts
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                        >
                          Choose File
                        </label>
                      </div>
                    )}
                  </div>

                  {selectedImage && (
                    <Button
                      onClick={analyzeImage}
                      disabled={isAnalyzing}
                      className="w-full"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        'Analyze for Diseases'
                      )}
                    </Button>
                  )}

                  {isAnalyzing && (
                    <Alert>
                      <AlertDescription>
                        🔬 AI is analyzing your image for potential diseases. This may take a few moments...
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysisResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {analysisResult.disease}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {analysisResult.crop ? `Detected in ${analysisResult.crop}` : 'Plant disease detected'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {analysisResult.confidence}%
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(analysisResult.severity)}`}>
                        {analysisResult.severity} Severity
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Immediate Treatment
                      </h4>
                      <ul className="space-y-2">
                        {analysisResult.treatment.map((step, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                            <span className="text-gray-700 dark:text-gray-300">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Prevention Tips
                      </h4>
                      <ul className="space-y-2">
                        {analysisResult.prevention.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                            <span className="text-gray-700 dark:text-gray-300">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button className="w-full">
                      Save Analysis & Create Treatment Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Detections */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Disease Detections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentDetections.map((detection) => (
                  <div key={detection.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{detection.disease}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{detection.crop}</p>
                      </div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {detection.confidence}%
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Severity:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(detection.severity)}`}>
                          {detection.severity}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(detection.status)}`}>
                          {detection.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{detection.date}</span>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
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

export default DiseaseDetection;