
import React from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';

const ExpertConsultations: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Expert Consultations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and respond to farmer consultation requests.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">👨‍🌾</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Consultation Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This page will display and manage farmer consultation requests and expert responses.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExpertConsultations;