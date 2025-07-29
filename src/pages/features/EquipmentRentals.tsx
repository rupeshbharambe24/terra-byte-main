
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import RentalForm from '../../components/RentalForm';
import OrderTracking from '../../components/OrderTracking';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Search, Calendar, Settings, MapPin } from 'lucide-react';

const EquipmentRentals: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', name: 'All Equipment', icon: '🚜' },
    { id: 'tractors', name: 'Tractors', icon: '🚜' },
    { id: 'harvesters', name: 'Harvesters', icon: '🌾' },
    { id: 'sprayers', name: 'Sprayers', icon: '💧' },
    { id: 'ploughs', name: 'Ploughs', icon: '⚙️' },
    { id: 'seeders', name: 'Seeders', icon: '🌱' }
  ];

  const equipment = [
    {
      id: 'EQ001',
      name: 'John Deere 5075E Tractor',
      category: 'tractors',
      type: 'Tractor',
      capacity: '75 HP',
      rentPrice: '₹1,500/day',
      location: 'Meerut, UP',
      availability: 'Available',
      rating: 4.8,
      image: '🚜',
      description: 'Heavy-duty tractor perfect for field preparation and harvesting',
      features: ['GPS Navigation', 'Air Conditioning', 'Power Steering']
    },
    {
      id: 'EQ002',
      name: 'Case IH 2000 Harvester',
      category: 'harvesters',
      type: 'Harvester',
      capacity: '200 HP',
      rentPrice: '₹4,000/day',
      location: 'Ludhiana, Punjab',
      availability: 'Available',
      rating: 4.7,
      image: '🌾',
      description: 'High-capacity harvester for efficient crop harvesting',
      features: ['Automatic Threshing', 'Grain Tank', 'Header Control']
    },
    {
      id: 'EQ003',
      name: 'Field King Sprayer',
      category: 'sprayers',
      type: 'Sprayer',
      capacity: '500L Tank',
      rentPrice: '₹600/day',
      location: 'Jaipur, Rajasthan',
      availability: 'Booked',
      rating: 4.5,
      image: '💧',
      description: 'Precision sprayer for pesticide and fertilizer application',
      features: ['Boom Control', 'Variable Rate', 'GPS Guidance']
    },
    {
      id: 'EQ004',
      name: 'Lemken Plough',
      category: 'ploughs',
      type: 'Plough',
      capacity: '3 Furrow',
      rentPrice: '₹800/day',
      location: 'Kheda, Gujarat',
      availability: 'Available',
      rating: 4.6,
      image: '⚙️',
      description: 'High-quality plough for deep soil preparation',
      features: ['Adjustable Depth', 'Spring Safety', 'Hardened Points']
    },
    {
      id: 'EQ005',
      name: 'Mahindra Seed Drill',
      category: 'seeders',
      type: 'Seeder',
      capacity: '9 Rows',
      rentPrice: '₹700/day',
      location: 'Coimbatore, TN',
      availability: 'Available',
      rating: 4.4,
      image: '🌱',
      description: 'Precision seeder for accurate seed placement',
      features: ['Depth Control', 'Fertilizer Box', 'Row Spacing']
    }
  ];

  const handleRent = (rentalData: any) => {
    console.log('Rental booking:', rentalData);
    // TODO: Integrate with Flask backend API
    // Example API call structure:
    // fetch('/api/rentals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(rentalData)
    // });
    alert('Equipment booked successfully! Booking ID: ' + Date.now());
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'Available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'Booked':
        return <Badge className="bg-red-100 text-red-800">Booked</Badge>;
      case 'Maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{availability}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}>
        ⭐
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <OrderTracking />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Equipment Rentals</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Rent high-quality agricultural equipment for your farming needs.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search equipment, location, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      activeCategory === category.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Equipment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{item.image}</div>
                    {getAvailabilityBadge(item.availability)}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.name}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center mb-3">
                    <div className="flex">{renderStars(item.rating)}</div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({item.rating})
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="text-gray-900 dark:text-white">{item.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Capacity:</span>
                      <span className="text-gray-900 dark:text-white">{item.capacity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Location:</span>
                      <span className="text-gray-900 dark:text-white flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.location}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Rate:</span>
                      <span className="text-xl font-bold text-purple-600">{item.rentPrice}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {item.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {item.availability === 'Available' ? (
                      <RentalForm equipment={item} onRent={handleRent} />
                    ) : (
                      <button disabled className="flex-1 bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed">
                        <Calendar className="w-4 h-4 mr-2" />
                        Not Available
                      </button>
                    )}
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      ❤️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEquipment.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No equipment found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default EquipmentRentals;