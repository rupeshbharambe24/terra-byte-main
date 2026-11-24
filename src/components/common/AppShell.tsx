import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

/** Header + sidebar layout used by the pages rebuilt from Phase 1 on. */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Header />
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
    </div>
  </div>
);

export default AppShell;
