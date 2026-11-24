import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionProps {
  title: string;
  /** Optional "view all" link. */
  link?: { to: string; label: string };
  note?: string;
  children: React.ReactNode;
  className?: string;
}

const Section: React.FC<SectionProps> = ({ title, link, note, children, className }) => (
  <Card className={className}>
    <CardHeader className="pb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {link && (
          <Link to={link.to} className="text-sm text-green-700 hover:underline dark:text-green-400">
            {link.label}
          </Link>
        )}
      </div>
      {note && <p className="text-xs text-gray-500 dark:text-gray-400">{note}</p>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default Section;
