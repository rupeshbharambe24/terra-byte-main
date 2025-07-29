
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            Terra<span className="text-green-600">Byte</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl mx-auto">
            The Ultimate Unified Agriculture Platform - Revolutionizing farming with smart technology, AI-driven insights, and sustainable practices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105"
            >
              Get Started Today
            </Link>
            <Link
              to="/login"
              className="border-2 border-green-600 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Powerful Features for Modern Agriculture
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Irrigation",
                description: "AI-powered irrigation control with real-time soil monitoring and weather prediction.",
                icon: "🌱"
              },
              {
                title: "Crop Planning",
                description: "Optimize your land use with AI-driven crop planning and yield predictions.",
                icon: "📊"
              },
              {
                title: "Disease Detection",
                description: "Early disease detection using advanced image recognition technology.",
                icon: "🔬"
              },
              {
                title: "Equipment Marketplace",
                description: "Rent or buy agricultural equipment from verified vendors.",
                icon: "🚜"
              },
              {
                title: "Expert Consultation",
                description: "Connect with agricultural experts for personalized advice.",
                icon: "👨‍🌾"
              },
              {
                title: "Market Intelligence",
                description: "Real-time market prices and MSP tracking for better decision making.",
                icon: "💰"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-green-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Trusted by Farmers Across India
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Rajesh Kumar",
                location: "Punjab",
                quote: "TerraByte has increased my crop yield by 30% while reducing water usage. The smart irrigation system is a game-changer!"
              },
              {
                name: "Priya Sharma",
                location: "Maharashtra",
                quote: "The disease detection feature saved my entire crop. Early warning helped me take preventive measures in time."
              },
              {
                name: "Suresh Patel",
                location: "Gujarat",
                quote: "Equipment rental through TerraByte is so convenient. I can access modern machinery without huge investments."
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mr-4">
                    <span className="text-green-600 dark:text-green-300 font-bold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Partnered with Leading Institutions
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">KVK Network</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">PM-KISAN</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">ICAR</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">State Agriculture Dept</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">TerraByte</h3>
              <p className="text-gray-400">Revolutionizing agriculture through technology and innovation.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/support" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/api" className="hover:text-white transition-colors">API</Link></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TerraByte. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
