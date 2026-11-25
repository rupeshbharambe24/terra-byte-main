import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { Role, UserStatus } from '@/lib/types';

const STATUS_CLASS: Record<UserStatus, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  rejected: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ROLE_CLASS: Record<Role, string> = {
  farmer: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
  vendor: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  hardware_vendor: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  expert: 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  admin: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={`border-transparent ${STATUS_CLASS[status]}`}>
      {t(`status.${status}`)}
    </Badge>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={`border-transparent whitespace-nowrap ${ROLE_CLASS[role]}`}>
      {t(`roles.${role}`)}
    </Badge>
  );
};
