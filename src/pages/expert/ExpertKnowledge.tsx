
import React from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';

const ExpertKnowledge: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Knowledge Base
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and contribute to the agricultural knowledge base.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Knowledge Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This page will allow experts to create, edit, and manage agricultural knowledge articles.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExpertKnowledge;