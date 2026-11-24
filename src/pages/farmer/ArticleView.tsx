import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageSpinner from '@/components/common/PageSpinner';
import { ErrorAlert } from '@/components/common/QueryState';
import { paragraphs } from '@/lib/advice';
import { adviceApi } from '@/lib/api';
import { formatDate } from '@/lib/format';

/** One article, rendered as plain-text paragraphs (no HTML from authors). */
const ArticleView: React.FC = () => {
  const { articleId } = useParams();
  const id = Number(articleId);
  const { t, i18n } = useTranslation(['advice', 'common']);
  const query = useQuery({
    queryKey: ['articles', 'detail', id],
    queryFn: () => adviceApi.article(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  const a = query.data;

  return (
    <AppShell>
      <Link to="/knowledge" className="mb-4 inline-flex items-center gap-1 text-sm text-green-700 hover:underline dark:text-green-400">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('articles.back')}
      </Link>
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError || !a ? (
        <ErrorAlert error={query.error} />
      ) : (
        <article className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 break-words dark:text-white sm:text-3xl">{a.title}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('articles.by', { name: a.author_name })}
            {a.crop ? ` · ${a.crop}` : ''}
            {a.published_at ? ` · ${t('articles.published', { date: formatDate(a.published_at, i18n.resolvedLanguage) })}` : ''}
          </p>
          {!a.published && (
            <p className="mt-3 rounded bg-amber-100 p-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              {t('articles.draftNote')}
            </p>
          )}
          <div className="mt-6 space-y-4 leading-relaxed text-gray-800 dark:text-gray-200">
            {paragraphs(a.body).map((p, i) => (
              <p key={i} className="whitespace-pre-line break-words">
                {p}
              </p>
            ))}
          </div>
        </article>
      )}
    </AppShell>
  );
};

export default ArticleView;
