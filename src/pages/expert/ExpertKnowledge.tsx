import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import ConfirmButton from '@/components/advice/ConfirmButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { blankToNull } from '@/lib/advice';
import { adviceApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type { Article } from '@/lib/types';

const TITLE = { min: 5, max: 200 };
const BODY = { min: 20, max: 20000 };

interface EditorProps {
  article: Article | null; // null = new
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ArticleEditor: React.FC<EditorProps> = ({ article, open, onOpenChange }) => {
  const { t } = useTranslation(['advice', 'common']);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(article?.title ?? '');
  const [crop, setCrop] = useState(article?.crop ?? '');
  const [body, setBody] = useState(article?.body ?? '');
  const [published, setPublished] = useState(article?.published ?? false);

  const save = useMutation({
    mutationFn: () => {
      const data = { title: title.trim(), crop: blankToNull(crop), body: body.trim(), published };
      return article ? adviceApi.updateArticle(article.id, data) : adviceApi.createArticle(data);
    },
    onSuccess: () => {
      toast.success(t('expertArticles.saved'));
      void queryClient.invalidateQueries({ queryKey: ['articles'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const valid = titleLen >= TITLE.min && titleLen <= TITLE.max && bodyLen >= BODY.min && bodyLen <= BODY.max;

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{article ? t('expertArticles.dialogEdit') : t('expertArticles.dialogNew')}</DialogTitle>
          <DialogDescription>{t('expertArticles.dialogHint')}</DialogDescription>
        </DialogHeader>
        <form
          id="article-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="article-title">{t('expertArticles.titleLabel')}</Label>
            <Input id="article-title" value={title} maxLength={TITLE.max} onChange={(e) => setTitle(e.target.value)} />
            {titleLen > 0 && titleLen < TITLE.min && (
              <p className="text-xs text-red-600">{t('expertArticles.titleHint', { min: TITLE.min })}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-crop">{t('expertArticles.cropLabel')}</Label>
            <Input
              id="article-crop"
              value={crop}
              maxLength={80}
              onChange={(e) => setCrop(e.target.value)}
              placeholder={t('articles.cropPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-body">{t('expertArticles.bodyLabel')}</Label>
            <Textarea
              id="article-body"
              rows={12}
              value={body}
              maxLength={BODY.max}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-gray-500">{t('expertArticles.bodyHint', { min: BODY.min, chars: bodyLen })}</p>
          </div>
          <div className="flex items-start gap-3">
            <Switch id="article-published" checked={published} onCheckedChange={setPublished} />
            <div>
              <Label htmlFor="article-published">{t('expertArticles.publishedLabel')}</Label>
              <p className="text-xs text-gray-500">{t('expertArticles.publishedHint')}</p>
            </div>
          </div>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form="article-form" disabled={!valid || save.isPending}>
            {save.isPending ? t('common:actions.saving') : t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** An expert's own articles: write, publish/unpublish, delete. */
const ExpertKnowledge: React.FC = () => {
  const { t, i18n } = useTranslation(['advice', 'common']);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Article | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const filters = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const query = useQuery({
    queryKey: ['articles', 'mine', filters],
    queryFn: () => adviceApi.myArticles(filters),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (a: Article) => adviceApi.updateArticle(a.id, { published: !a.published }),
    onSuccess: (a) => {
      toast.success(a.published ? t('expertArticles.publishedToast') : t('expertArticles.unpublishedToast'));
      void queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => adviceApi.deleteArticle(id),
    onSuccess: () => {
      toast.success(t('expertArticles.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const openEditor = (a: Article | null) => {
    setEditing(a);
    setEditorKey((k) => k + 1); // fresh form state for each opening
    setEditorOpen(true);
  };
  const lng = i18n.resolvedLanguage;

  return (
    <AppShell>
      <PageHeader
        title={t('expertArticles.title')}
        subtitle={t('expertArticles.subtitle')}
        actions={
          <Button onClick={() => openEditor(null)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('expertArticles.new')}
          </Button>
        }
      />
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : !query.data || query.data.total === 0 ? (
        <EmptyState icon={BookOpen} title={t('expertArticles.empty')} body={t('expertArticles.emptyBody')} />
      ) : (
        <div className="space-y-3">
          {query.data.items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {a.published ? (
                      <Link to={`/knowledge/${a.id}`} className="font-medium break-words hover:text-green-700">
                        {a.title}
                      </Link>
                    ) : (
                      <span className="font-medium break-words">{a.title}</span>
                    )}
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {a.crop ? `${a.crop} · ` : ''}
                      {a.published && a.published_at
                        ? t('articles.published', { date: formatDate(a.published_at, lng) })
                        : t('expertArticles.updated', { date: formatDate(a.updated_at, lng) })}
                    </p>
                  </div>
                  <Badge variant={a.published ? 'default' : 'outline'}>
                    {a.published ? t('expertArticles.publishedBadge') : t('expertArticles.draft')}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditor(a)}>
                    {t('common:actions.edit')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate(a)} disabled={toggle.isPending}>
                    {a.published ? t('expertArticles.unpublish') : t('expertArticles.publish')}
                  </Button>
                  <ConfirmButton
                    label={t('common:actions.delete')}
                    title={t('expertArticles.deleteTitle', { title: a.title })}
                    body={t('expertArticles.deleteBody')}
                    confirmLabel={t('common:actions.delete')}
                    cancelLabel={t('common:actions.cancel')}
                    onConfirm={() => remove.mutate(a.id)}
                    disabled={remove.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Pager page={page} total={query.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      )}
      <ArticleEditor key={editorKey} article={editing} open={editorOpen} onOpenChange={setEditorOpen} />
    </AppShell>
  );
};

export default ExpertKnowledge;
