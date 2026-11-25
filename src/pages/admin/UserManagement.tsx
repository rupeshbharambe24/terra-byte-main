import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageSpinner from '@/components/common/PageSpinner';
import { RoleBadge, StatusBadge } from '@/components/admin/badges';
import StatusActionButton from '@/components/admin/StatusActionButton';
import { availableActions } from '@/components/admin/userActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatLocation } from '@/lib/format';
import { ROLES, USER_STATUSES, type Role, type UserStatus } from '@/lib/types';

const PAGE_SIZE = 20;
const ALL = 'all';

const UserManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | typeof ALL>(ALL);
  const [status, setStatus] = useState<UserStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);

  const filters = {
    q: q || undefined,
    role: role === ALL ? undefined : role,
    status: status === ALL ? undefined : status,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: ({ signal }) => adminApi.listUsers(filters, signal),
    placeholderData: keepPreviousData,
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('users.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('users.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
          <Input
            type="search"
            aria-label={t('users.searchPlaceholder')}
            placeholder={t('users.searchPlaceholder')}
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-[26rem]">
          <Select value={role} onValueChange={(v) => resetPage(setRole)(v as Role | typeof ALL)}>
            <SelectTrigger aria-label={t('users.columns.role')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('users.allRoles')}</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{t(`common:roles.${r}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => resetPage(setStatus)(v as UserStatus | typeof ALL)}>
            <SelectTrigger aria-label={t('users.columns.status')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('users.allStatuses')}</SelectItem>
              {USER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`common:status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
          {errorMessage(t, error)}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2" aria-live="polite">
            {t('users.total', { count: data?.total ?? 0 })}
          </p>
          <Card className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('users.columns.user')}</TableHead>
                    <TableHead>{t('users.columns.role')}</TableHead>
                    <TableHead>{t('users.columns.status')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('users.columns.location')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('users.columns.registered')}</TableHead>
                    <TableHead>{t('users.columns.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data && data.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">{t('users.empty')}</TableCell>
                    </TableRow>
                  )}
                  {data?.items.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.phone}{u.email ? ` · ${u.email}` : ''}</div>
                        {u.organization && <div className="text-sm text-gray-500">{u.organization}</div>}
                      </TableCell>
                      <TableCell><RoleBadge role={u.role} /></TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                        {u.status_reason && <div className="mt-1 text-xs text-gray-500 max-w-[14rem]">{u.status_reason}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatLocation([u.village, u.district, u.state])}</TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDate(u.created_at, i18n.resolvedLanguage)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {availableActions(u).map((action) => (
                            <StatusActionButton key={action} user={u} action={action} />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t('users.previous')}
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('users.page', { page: page + 1, pages })}
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                {t('users.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
};

export default UserManagement;
