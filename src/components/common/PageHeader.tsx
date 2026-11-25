import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Buttons shown on the right (below the title on small screens). */
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">{title}</h1>
      {subtitle && <p className="text-gray-600 dark:text-gray-400 mt-2">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
