import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ExternalLink, Mail, MapPin, MessageSquare, Phone, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import ImagePicker from '@/components/common/ImagePicker';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import ConsultationCard from '@/components/advice/ConsultationCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { blankToNull } from '@/lib/advice';
import { adviceApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS, PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { CONSULTATION_CATEGORIES, type ConsultationCategory, type KVK } from '@/lib/types';

const NONE = 'none';
const ALL = 'all';
const MIN_QUESTION = 10;
const MAX_QUESTION = 4000;
const TABS = ['ask', 'mine', 'kvks'] as const;
type Tab = (typeof TABS)[number];

// ---- Ask a question -----------------------------------------------------------------------------

const AskForm: React.FC = () => {
  const { t } = useTranslation(['advice', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [crop, setCrop] = useState('');
  const [category, setCategory] = useState<ConsultationCategory | ''>('');
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [kvkId, setKvkId] = useState<string>(NONE);

  const kvks = useQuery({
    queryKey: ['kvks', 'select'],
    queryFn: () => adviceApi.kvks({ limit: 100 }),
  });
  const kvkOptions = useMemo(() => {
    const items = kvks.data?.items ?? [];
    const home = (user?.district ?? '').toLowerCase();
    // KVKs in the farmer's own district first.
    return [...items].sort((a, b) => Number(b.district.toLowerCase() === home) - Number(a.district.toLowerCase() === home));
  }, [kvks.data, user?.district]);

  const ask = useMutation({
    mutationFn: () =>
      adviceApi.ask({
        crop: blankToNull(crop),
        category: category as ConsultationCategory,
        question: question.trim(),
        image_path: image,
        kvk_id: kvkId === NONE ? null : Number(kvkId),
      }),
    onSuccess: (c) => {
      toast.success(t('ask.sent'));
      void queryClient.invalidateQueries({ queryKey: ['consultations'] });
      navigate(`/consultations/${c.id}`);
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const length = question.trim().length;
  const valid = category !== '' && length >= MIN_QUESTION && length <= MAX_QUESTION;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('ask.formTitle')}</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('ask.formHint')}</p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) ask.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ask-category">{t('ask.category')}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ConsultationCategory)}>
                <SelectTrigger id="ask-category">
                  <SelectValue placeholder={t('ask.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTATION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ask-crop">{t('ask.crop')}</Label>
              <Input
                id="ask-crop"
                value={crop}
                maxLength={80}
                onChange={(e) => setCrop(e.target.value)}
                placeholder={t('ask.cropPlaceholder')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ask-question">{t('ask.question')}</Label>
            <Textarea
              id="ask-question"
              value={question}
              rows={6}
              maxLength={MAX_QUESTION}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('ask.questionPlaceholder')}
              aria-describedby="ask-question-hint"
            />
            <p id="ask-question-hint" className="text-xs text-gray-500">
              {length > 0 && length < MIN_QUESTION
                ? t('ask.tooShort', { min: MIN_QUESTION })
                : t('ask.length', { chars: length, max: MAX_QUESTION })}
            </p>
          </div>
          <ImagePicker value={image} onChange={setImage} label={t('ask.photo')} disabled={ask.isPending} />
          <div className="space-y-2">
            <Label htmlFor="ask-kvk">{t('ask.kvk')}</Label>
            <Select value={kvkId} onValueChange={setKvkId} disabled={kvkOptions.length === 0}>
              <SelectTrigger id="ask-kvk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('ask.kvkNone')}</SelectItem>
                {kvkOptions.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)}>
                    {k.name} · {k.district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {kvkOptions.length === 0 ? t('ask.kvkEmptyHint') : t('ask.kvkHint')}
            </p>
          </div>
          <Button type="submit" className="bg-green-600 text-white hover:bg-green-700" disabled={!valid || ask.isPending}>
            {ask.isPending ? t('ask.submitting') : t('ask.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ---- My questions -------------------------------------------------------------------------------

const MyQuestions: React.FC<{ onAsk: () => void }> = ({ onAsk }) => {
  const { t } = useTranslation(['advice', 'common']);
  const [page, setPage] = useState(0);
  const filters = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const query = useQuery({
    queryKey: ['consultations', 'mine', filters],
    queryFn: () => adviceApi.consultations(filters),
    placeholderData: keepPreviousData,
  });
  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorAlert error={query.error} />;
  if (!query.data || query.data.total === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={t('mine.empty')}
        body={t('mine.emptyBody')}
        action={<Button onClick={onAsk}>{t('ask.formTitle')}</Button>}
      />
    );
  }
  return (
    <div className="space-y-3">
      {query.data.items.map((c) => (
        <ConsultationCard key={c.id} consultation={c} />
      ))}
      <Pager page={page} total={query.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
};

// ---- KVK directory ------------------------------------------------------------------------------

const KVKCard: React.FC<{ kvk: KVK }> = ({ kvk: k }) => {
  const { t, i18n } = useTranslation(['advice', 'common']);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base break-words">{k.name}</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {k.district}, {k.state}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {k.host_organisation && (
          <p>
            <span className="text-gray-500">{t('kvk.host')}: </span>
            {k.host_organisation}
          </p>
        )}
        {(k.address || k.pincode) && (
          <p className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <span className="break-words">
              {k.address}
              {k.pincode ? ` – ${k.pincode}` : ''}
            </span>
          </p>
        )}
        {k.phone && (
          <p className="flex gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <a href={`tel:${k.phone.replace(/[^\d+]/g, '')}`} className="text-green-700 hover:underline dark:text-green-400">
              {k.phone}
            </a>
          </p>
        )}
        {k.email && (
          <p className="flex gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <a href={`mailto:${k.email}`} className="break-all text-green-700 hover:underline dark:text-green-400">
              {k.email}
            </a>
          </p>
        )}
        {k.website && (
          <p className="flex gap-2">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <a href={k.website} target="_blank" rel="noreferrer noopener" className="break-all text-green-700 hover:underline dark:text-green-400">
              {t('kvk.website')}
            </a>
          </p>
        )}
        <p className="pt-1 text-xs text-gray-500">
          {k.verified_on ? t('kvk.verifiedOn', { date: formatDate(k.verified_on, i18n.resolvedLanguage) }) : t('kvk.notVerified')}
          {k.source_url && (
            <>
              {' · '}
              <a href={k.source_url} target="_blank" rel="noreferrer noopener" className="underline">
                {t('kvk.source')}
              </a>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
};

const KVKDirectory: React.FC = () => {
  const { t } = useTranslation(['advice', 'common']);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);
  const filters = {
    q: q || undefined,
    district: district === ALL ? undefined : district,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const query = useQuery({
    queryKey: ['kvks', 'directory', filters],
    queryFn: () => adviceApi.kvks(filters),
    placeholderData: keepPreviousData,
  });
  const filtered = Boolean(filters.q || filters.district);
  const directoryEmpty = !filtered && query.data?.total === 0;

  return (
    <div className="space-y-4">
      {!directoryEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              type="search"
              className="pl-10"
              value={search}
              aria-label={t('kvk.search')}
              placeholder={t('kvk.search')}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select
            value={district}
            onValueChange={(v) => {
              setDistrict(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="sm:w-64" aria-label={t('kvk.district')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('kvk.allDistricts')}</SelectItem>
              {MAHARASHTRA_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : directoryEmpty ? (
        <EmptyState icon={Building2} title={t('kvk.emptyTitle')} body={t('kvk.emptyBody')} />
      ) : query.data && query.data.total === 0 ? (
        <EmptyState icon={Search} title={t('kvk.noMatch')} />
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('kvk.count', { count: query.data?.total ?? 0 })}
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {query.data?.items.map((k) => <KVKCard key={k.id} kvk={k} />)}
          </div>
          <Pager page={page} total={query.data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
};

// ---- Page ---------------------------------------------------------------------------------------

const KVKConsultation: React.FC = () => {
  const { t } = useTranslation(['advice', 'common']);
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? '') ? (requested as Tab) : 'ask';
  const setTab = (next: string) => setParams(next === 'ask' ? {} : { tab: next }, { replace: true });

  return (
    <AppShell>
      <PageHeader title={t('ask.title')} subtitle={t('ask.subtitle')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
          <TabsTrigger value="ask">{t('ask.tabAsk')}</TabsTrigger>
          <TabsTrigger value="mine">{t('ask.tabMine')}</TabsTrigger>
          <TabsTrigger value="kvks">{t('ask.tabKvk')}</TabsTrigger>
        </TabsList>
        <TabsContent value="ask" className="max-w-3xl">
          <AskForm />
        </TabsContent>
        <TabsContent value="mine">
          <MyQuestions onAsk={() => setTab('ask')} />
        </TabsContent>
        <TabsContent value="kvks">
          <KVKDirectory />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default KVKConsultation;
