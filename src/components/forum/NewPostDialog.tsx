import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import ImagePicker from '@/components/common/ImagePicker';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { forumApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { FORUM_CATEGORIES, type ForumCategory } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = { title: '', body: '', category: 'general' as ForumCategory, crop: '', image: null as string | null };

const NewPostDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation(['forum', 'common']);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const mutation = useMutation({
    mutationFn: () =>
      forumApi.createPost({
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        crop: form.crop.trim() || null,
        image_path: form.image,
      }),
    onSuccess: (post) => {
      toast.success(t('form.created'));
      void queryClient.invalidateQueries({ queryKey: ['forum'] });
      setForm(EMPTY);
      onOpenChange(false);
      navigate(`/forums/${post.id}`);
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const next: typeof errors = {};
    if (title.length < 5 || title.length > 200) next.title = t('form.titleInvalid');
    if (!form.body.trim()) next.body = t('form.bodyRequired');
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('form.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('form.dialogBody')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="post-title">{t('form.title')}</Label>
            <Input
              id="post-title"
              value={form.title}
              maxLength={200}
              aria-invalid={!!errors.title}
              aria-describedby="post-title-hint"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <p id="post-title-hint" className={`text-xs ${errors.title ? 'text-red-600' : 'text-gray-500'}`}>
              {errors.title ?? t('form.titleHint')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-body">{t('form.body')}</Label>
            <Textarea
              id="post-body"
              rows={5}
              value={form.body}
              maxLength={5000}
              aria-invalid={!!errors.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            {errors.body && <p className="text-xs text-red-600">{errors.body}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="post-category">{t('form.category')}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ForumCategory })}>
                <SelectTrigger id="post-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORUM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-crop">{t('form.crop')}</Label>
              <Input
                id="post-crop"
                value={form.crop}
                maxLength={80}
                placeholder={t('form.cropPlaceholder')}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
              />
            </div>
          </div>
          <ImagePicker
            label={t('form.photo')}
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
            disabled={mutation.isPending}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {mutation.isPending ? t('common:actions.saving') : t('form.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPostDialog;
