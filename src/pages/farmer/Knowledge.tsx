import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adviceApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { formatDate } from '@/lib/format';

/** Published articles written by approved experts. */
const Knowledge: React.FC = () => {
  const { t, i18n } = useTranslation(['advice', 'common']);
  const [search, setSearch] = useState('');
  const [crop, setCrop] = useState('');
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);
  const cropQ = useDebouncedValue(crop.trim(), 300);
  const filters = { q: q || undefined, crop: cropQ || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const query = useQuery({
    queryKey: ['articles', 'published', filters],
    queryFn: () => adviceApi.articles(filters),
    placeholderData: keepPreviousData,
  });
  const filtered = Boolean(filters.q || filters.crop);

  return (
    <AppShell>
      <PageHeader title={t('articles.title')} subtitle={t('articles.subtitle')} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            className="pl-10"
            value={search}
            aria-label={t('articles.search')}
            placeholder={t('articles.search')}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Input
          className="sm:w-56"
          value={crop}
          aria-label={t('articles.crop')}
          placeholder={t('articles.cropPlaceholder')}
          onChange={(e) => {
            setCrop(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : !query.data || query.data.total === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={filtered ? t('articles.noMatch') : t('articles.empty')}
          body={filtered ? undefined : t('articles.emptyBody')}
        />
      ) : (
        <div className="space-y-3">
          {query.data.items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <Link
                  to={`/knowledge/${a.id}`}
                  className="text-lg font-medium text-gray-900 break-words hover:text-green-700 dark:text-gray-100 dark:hover:text-green-400"
                >
                  {a.title}
                </Link>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t('articles.by', { name: a.author_name })}
                  {a.crop ? ` · ${a.crop}` : ''}
                  {a.published_at ? ` · ${t('articles.published', { date: formatDate(a.published_at, i18n.resolvedLanguage) })}` : ''}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-gray-700 dark:text-gray-300 break-words">{a.body}</p>
              </CardContent>
            </Card>
          ))}
          <Pager page={page} total={query.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      )}
    </AppShell>
  );
};

export default Knowledge;
