import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import PurchaseForm from '../../components/PurchaseForm';
import OrderTracking from '../../components/OrderTracking';

const Marketplace: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', name: 'All Products', icon: '🛒' },
    { id: 'seeds', name: 'Seeds', icon: '🌱' },
    { id: 'fertilizers', name: 'Fertilizers', icon: '🧪' },
    { id: 'tools', name: 'Tools', icon: '🔧' },
    { id: 'pesticides', name: 'Pesticides', icon: '🧴' }
  ];

  const products = [
    {
      id: 1,
      name: 'Premium Wheat Seeds',
      category: 'seeds',
      price: '₹1,200',
      unit: '10kg bag',
      vendor: 'AgriSeeds Co.',
      rating: 4.5,
      image: '🌾',
      description: 'High-yield wheat seeds with disease resistance'
    },
    {
      id: 2,
      name: 'Organic NPK Fertilizer',
      category: 'fertilizers',
      price: '₹850',
      unit: '50kg bag',
      vendor: 'Green Grow',
      rating: 4.7,
      image: '🧪',
      description: 'Organic NPK fertilizer for sustainable farming'
    },
    {
      id: 3,
      name: 'Smart Sprayer',
      category: 'tools',
      price: '₹15,000',
      unit: 'per piece',
      vendor: 'Farm Tech',
      rating: 4.3,
      image: '🔧',
      description: 'Automated sprayer with precision control'
    },
    {
      id: 4,
      name: 'Bio Pesticide',
      category: 'pesticides',
      price: '₹650',
      unit: '1 liter',
      vendor: 'BioProtect',
      rating: 4.6,
      image: '🧴',
      description: 'Eco-friendly pesticide for crop protection'
    },
    {
      id: 5,
      name: 'Rice Seeds - Basmati',
      category: 'seeds',
      price: '₹2,500',
      unit: '25kg bag',
      vendor: 'Quality Seeds',
      rating: 4.8,
      image: '🍚',
      description: 'Premium basmati rice seeds for aromatic rice'
    },
    {
      id: 6,
      name: 'Micronutrient Mix',
      category: 'fertilizers',
      price: '₹450',
      unit: '5kg pack',
      vendor: 'NutriCrop',
      rating: 4.4,
      image: '🧪',
      description: 'Essential micronutrients for healthy crop growth'
    }
  ];

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <OrderTracking />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agricultural Marketplace</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Browse and purchase quality agricultural products from verified vendors.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products or vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      activeCategory === category.id
                        ? 'bg-green-600 text-white'
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

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{product.image}</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.category === 'seeds' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' :
                      product.category === 'fertilizers' ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' :
                      product.category === 'tools' ? 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300' :
                      'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300'
                    }`}>
                      {product.category}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center mb-3">
                    <div className="flex">{renderStars(product.rating)}</div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({product.rating})
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {product.price}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {product.unit}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      by {product.vendor}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <PurchaseForm product={product} />
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      ❤️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No products found
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

export default Marketplace;