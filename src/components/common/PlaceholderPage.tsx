
import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="text-6xl mb-6">🚧</div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">{description}</p>
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            This feature is currently under development. Check back soon for updates!
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
