import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { RoleBadge } from '@/components/admin/badges';
import { ModerationBadge } from '@/components/forum/ForumActions';
import NewPostDialog from '@/components/forum/NewPostDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { forumApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { excerpt } from '@/lib/forum';
import { formatDate } from '@/lib/format';
import { FORUM_CATEGORIES } from '@/lib/types';

const ALL = 'all';

/** Community forum: posts by farmers, experts and admins, filtered and paginated on the server. */
const Forums: React.FC = () => {
  const { t, i18n } = useTranslation(['forum', 'common']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const q = useDebouncedValue(search.trim(), 300);

  const filters = {
    q: q || undefined,
    category: category === ALL ? undefined : category,
    mine: mine || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['forum', 'posts', filters],
    queryFn: () => forumApi.posts(filters),
    placeholderData: keepPreviousData,
  });
  const filtered = !!(q || category !== ALL || mine);

  return (
    <AppShell>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button onClick={() => setCreating(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('newPost')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            aria-label={t('searchPlaceholder')}
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-56" aria-label={t('form.category')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allCategories')}</SelectItem>
              {FORUM_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`categories.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="forum-mine"
              checked={mine}
              onCheckedChange={(v) => {
                setMine(v);
                setPage(0);
              }}
            />
            <Label htmlFor="forum-mine">{t('myPosts')}</Label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data && data.items.length === 0 ? (
        filtered ? (
          <EmptyState title={t('emptyFiltered')} icon={MessageSquare} />
        ) : (
          <EmptyState title={t('empty')} body={t('emptyBody')} icon={MessageSquare} />
        )
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('count', { count: data?.total ?? 0 })}
          </p>
          <ul className={`space-y-3 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {data?.items.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/forums/${post.id}`}
                  className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="min-w-0 break-words text-lg font-semibold text-gray-900 dark:text-white">
                          {post.title}
                        </h2>
                        <ModerationBadge status={post.moderation_status} />
                      </div>
                      <p className="mt-1 break-words text-sm text-gray-700 dark:text-gray-300">{excerpt(post.body)}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{post.author.name}</span>
                        <RoleBadge role={post.author.role} />
                        {post.category && <Badge variant="secondary">{t(`categories.${post.category}`)}</Badge>}
                        {post.crop && <Badge variant="outline">{post.crop}</Badge>}
                        <span>{t('replies', { count: post.reply_count })}</span>
                        <span>· {formatDate(post.created_at, i18n.resolvedLanguage)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      <NewPostDialog open={creating} onOpenChange={setCreating} />
    </AppShell>
  );
};

export default Forums;
