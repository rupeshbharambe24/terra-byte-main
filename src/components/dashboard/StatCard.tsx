import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  /** Makes the whole card a link. */
  to?: string;
}

/** One number from the API with a label. No trend arrows: we only show what is stored. */
const StatCard: React.FC<StatCardProps> = ({ label, value, hint, icon: Icon, to }) => {
  const body = (
    <Card className={to ? 'h-full transition-shadow hover:shadow-md focus-within:ring-2' : 'h-full'}>
      <CardContent className="flex items-start gap-3 p-4">
        {Icon && (
          <div className="rounded-lg bg-green-50 p-2 text-green-700 dark:bg-green-950 dark:text-green-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white break-words">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
      {body}
    </Link>
  ) : (
    body
  );
};

export default StatCard;
