import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, ExternalLink, Filter, MapPin } from 'lucide-react';

interface Scheme {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  benefits: string;
  state: string;
  cropType: string;
  benefitType: 'subsidy' | 'insurance' | 'loan' | 'training' | 'technology';
  applyUrl: string;
  department: string;
}

const mockSchemes: Scheme[] = [
  {
    id: '1',
    name: 'PM-KISAN Samman Nidhi',
    description: 'Direct income support to farmers with cultivable land holding',
    eligibility: 'Small and marginal farmers with cultivable land',
    benefits: '₹6,000 per year in three installments',
    state: 'All States',
    cropType: 'All Crops',
    benefitType: 'subsidy',
    applyUrl: 'https://pmkisan.gov.in',
    department: 'Ministry of Agriculture'
  },
  {
    id: '2',
    name: 'Pradhan Mantri Fasal Bima Yojana',
    description: 'Crop insurance scheme for farmers against crop loss',
    eligibility: 'All farmers growing notified crops',
    benefits: 'Insurance coverage for crop loss due to natural calamities',
    state: 'All States',
    cropType: 'Rice, Wheat, Cotton',
    benefitType: 'insurance',
    applyUrl: 'https://pmfby.gov.in',
    department: 'Ministry of Agriculture'
  },
  {
    id: '3',
    name: 'Kisan Credit Card',
    description: 'Credit facility for farmers to meet cultivation expenses',
    eligibility: 'Farmers owning cultivable land',
    benefits: 'Credit up to ₹3 lakh at 4% interest rate',
    state: 'All States',
    cropType: 'All Crops',
    benefitType: 'loan',
    applyUrl: 'https://kcc.gov.in',
    department: 'Ministry of Agriculture'
  },
  {
    id: '4',
    name: 'Soil Health Management',
    description: 'Scheme to promote soil testing and balanced fertilizer use',
    eligibility: 'All farmers',
    benefits: 'Free soil testing and nutrient management advice',
    state: 'Maharashtra',
    cropType: 'Cotton, Sugarcane',
    benefitType: 'technology',
    applyUrl: 'https://soilhealth.dac.gov.in',
    department: 'Department of Agriculture'
  },
  {
    id: '5',
    name: 'Mission for Integrated Development of Horticulture',
    description: 'Holistic development of horticulture sector',
    eligibility: 'Horticulture farmers and entrepreneurs',
    benefits: 'Subsidy for greenhouse, drip irrigation, cold storage',
    state: 'Kerala',
    cropType: 'Fruits, Vegetables',
    benefitType: 'subsidy',
    applyUrl: 'https://midh.gov.in',
    department: 'Ministry of Agriculture'
  }
];

const GovernmentSchemes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [benefitFilter, setBenefitFilter] = useState('all');

  const filteredSchemes = mockSchemes.filter(scheme => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scheme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || scheme.state === stateFilter || scheme.state === 'All States';
    const matchesCrop = cropFilter === 'all' || scheme.cropType.includes(cropFilter) || scheme.cropType === 'All Crops';
    const matchesBenefit = benefitFilter === 'all' || scheme.benefitType === benefitFilter;

    return matchesSearch && matchesState && matchesCrop && matchesBenefit;
  });

  const getBenefitTypeColor = (type: string) => {
    switch (type) {
      case 'subsidy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'insurance': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'loan': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'training': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'technology': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                🌾 Government Schemes
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Discover and apply for agriculture-related government schemes and benefits
              </p>
            </div>

            {/* Search and Filters */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Search & Filter Schemes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search schemes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="Kerala">Kerala</SelectItem>
                      <SelectItem value="Punjab">Punjab</SelectItem>
                      <SelectItem value="Karnataka">Karnataka</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={cropFilter} onValueChange={setCropFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Crop Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Crops</SelectItem>
                      <SelectItem value="Rice">Rice</SelectItem>
                      <SelectItem value="Wheat">Wheat</SelectItem>
                      <SelectItem value="Cotton">Cotton</SelectItem>
                      <SelectItem value="Sugarcane">Sugarcane</SelectItem>
                      <SelectItem value="Fruits">Fruits</SelectItem>
                      <SelectItem value="Vegetables">Vegetables</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={benefitFilter} onValueChange={setBenefitFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Benefit Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Benefits</SelectItem>
                      <SelectItem value="subsidy">Subsidy</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                Found {filteredSchemes.length} scheme(s) matching your criteria
              </p>
            </div>

            {/* Schemes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSchemes.map((scheme) => (
                <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl">{scheme.name}</CardTitle>
                      <Badge className={getBenefitTypeColor(scheme.benefitType)}>
                        {scheme.benefitType.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>{scheme.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                        Eligibility:
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {scheme.eligibility}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-green-700 dark:text-green-400 mb-1">
                        Benefits:
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {scheme.benefits}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {scheme.state}
                      </Badge>
                      <Badge variant="outline">
                        {scheme.cropType}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Department: {scheme.department}
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => window.open(scheme.applyUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apply Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSchemes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No schemes found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default GovernmentSchemes;