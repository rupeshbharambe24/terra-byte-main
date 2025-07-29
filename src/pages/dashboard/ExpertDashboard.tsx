
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';

const ExpertDashboard: React.FC = () => {
  const { user } = useAuth();

  const expertCards = [
    {
      title: 'Farmer Queries',
      description: 'Answer farmer questions',
      icon: '💬',
      path: '/forums',
      count: '24 new queries'
    },
    {
      title: 'Knowledge Base',
      description: 'Manage knowledge articles',
      icon: '📚',
      path: '/knowledge-base',
      count: '145 articles'
    },
    {
      title: 'Disease Detection',
      description: 'Review AI disease predictions',
      icon: '🔬',
      path: '/disease-review',
      count: '8 pending reviews'
    },
    {
      title: 'Crop Trends',
      description: 'View regional crop data',
      icon: '📈',
      path: '/crop-trends',
      count: 'Updated daily'
    }
  ];

  const recentQueries = [
    {
      farmer: 'Rajesh Kumar',
      question: 'Yellow spots on wheat leaves - what could be the cause?',
      time: '2 hours ago',
      status: 'pending'
    },
    {
      farmer: 'Priya Sharma',
      question: 'Best fertilizer schedule for cotton crop?',
      time: '4 hours ago',
      status: 'answered'
    },
    {
      farmer: 'Suresh Patel',
      question: 'How to improve soil pH naturally?',
      time: '6 hours ago',
      status: 'pending'
    },
    {
      farmer: 'Maya Singh',
      question: 'Organic pest control methods for tomatoes?',
      time: '1 day ago',
      status: 'answered'
    }
  ];

  const stats = [
    { label: 'Queries Answered', value: '156', period: 'This Month' },
    { label: 'Farmer Helped', value: '89', period: 'This Month' },
    { label: 'Response Rate', value: '98%', period: 'Average' },
    { label: 'Rating', value: '4.9', period: '5 Star Rating' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Expert Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Help farmers with your expertise and knowledge.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.period}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Expert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {expertCards.map((card, index) => (
              <Link
                key={index}
                to={card.path}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all transform hover:scale-105"
              >
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {card.description}
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  {card.count}
                </p>
              </Link>
            ))}
          </div>

          {/* Recent Queries */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Farmer Queries</h2>
              <Link
                to="/forums"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentQueries.map((query, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{query.farmer}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          query.status === 'pending' 
                            ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                        }`}>
                          {query.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{query.question}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{query.time}</p>
                    </div>
                    {query.status === 'pending' && (
                      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        Answer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExpertDashboard;
