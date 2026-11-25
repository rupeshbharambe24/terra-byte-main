import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Landmark, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Caution, ExtLink } from '@/components/agro/SourceNote';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { agroApi, localName, type Scheme, type SchemeStatus } from '@/lib/agro';
import { formatDate, formatMoney } from '@/lib/format';

const ALL = 'all';

const STATUS_STYLE: Record<SchemeStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  changed: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  unverified: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  closed: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const SchemeCard: React.FC<{ s: Scheme }> = ({ s }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>
            {t(`schemes.status.${s.status}`)}
          </span>
          <Badge variant="outline">{t(`schemes.level.${s.level}`)}</Badge>
        </div>
        <CardTitle className="text-base break-words">{localName(s, lng)}</CardTitle>
        {lng !== 'en' && <p className="text-xs text-gray-500">{s.name_en}</p>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {s.status !== 'active' && <Caution>{t(`schemes.statusHelp.${s.status}`)}</Caution>}
        <div lang="en" className="space-y-2">
          {s.benefit && (
            <p>
              <span className="font-medium">{t('schemes.benefit')}: </span>
              {s.benefit}
            </p>
          )}
          {open && (
            <>
              {s.eligibility && (
                <p>
                  <span className="font-medium">{t('schemes.eligibility')}: </span>
                  {s.eligibility}
                </p>
              )}
              {s.exclusions && s.exclusions.length > 0 && (
                <div>
                  <p className="font-medium">{t('schemes.exclusions')}:</p>
                  <ul className="list-disc pl-5">
                    {s.exclusions.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {s.documents_required && s.documents_required.length > 0 && (
                <div>
                  <p className="font-medium">{t('schemes.documents')}:</p>
                  <ul className="list-disc pl-5">
                    {s.documents_required.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {s.how_to_apply && (
                <p>
                  <span className="font-medium">{t('schemes.howToApply')}: </span>
                  {s.how_to_apply}
                </p>
              )}
              {s.status_note && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{t('schemes.statusNote')}: </span>
                  {s.status_note}
                </p>
              )}
              {s.source_urls && s.source_urls.length > 0 && (
                <p className="text-xs">
                  <span className="font-medium">{t('common.sources')}: </span>
                  {s.source_urls.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer noopener" className="mr-2 underline">
                      [{i + 1}]
                    </a>
                  ))}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" className="text-sm text-green-700 hover:underline dark:text-green-400" onClick={() => setOpen((v) => !v)}>
            {open ? t('schemes.less') : t('schemes.more')}
          </button>
          {s.official_url && <ExtLink href={s.official_url}>{t('schemes.official')}</ExtLink>}
        </div>
        <p className="text-xs text-gray-500">{t('common.lastVerified', { date: formatDate(s.last_verified, lng) })}</p>
      </CardContent>
    </Card>
  );
};

const SchemesList: React.FC = () => {
  const { t } = useTranslation('agro');
  const [level, setLevel] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const filters = { level: level === ALL ? undefined : level, q: q || undefined };
  const query = useQuery({ queryKey: ['schemes', filters], queryFn: () => agroApi.schemes(filters) });
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            className="pl-10"
            value={search}
            placeholder={t('schemes.search')}
            aria-label={t('schemes.search')}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="sm:w-56" aria-label={t('schemes.levelLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('schemes.level.all')}</SelectItem>
            <SelectItem value="central">{t('schemes.level.central')}</SelectItem>
            <SelectItem value="maharashtra">{t('schemes.level.maharashtra')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-gray-500">{t('schemes.englishNote')}</p>
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : query.data && query.data.total === 0 ? (
        <EmptyState icon={Search} title={t('schemes.noMatch')} />
      ) : query.data ? (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('schemes.count', { count: query.data.total })}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {query.data.items.map((s) => (
              <SchemeCard key={s.id} s={s} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

const MSPTable: React.FC = () => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const query = useQuery({ queryKey: ['msp'], queryFn: agroApi.msp });
  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorAlert error={query.error} />;
  if (!query.data) return null;
  const latest = query.data.seasons.filter((s) => s.latest);
  return (
    <div className="space-y-4">
      <Caution title={t('msp.notGuaranteedTitle')}>{t('msp.notGuaranteed')}</Caution>
      {latest.map((season) => (
        <Card key={`${season.season}-${season.marketing_year}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t('msp.seasonTitle', { season: season.season, year: season.marketing_year })}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-2 font-medium">{t('msp.crop')}</th>
                  <th className="py-2 pr-2 text-right font-medium">{t('msp.price')}</th>
                  <th className="py-2 pr-2 text-right font-medium">{t('msp.increase')}</th>
                  <th className="py-2 font-medium">{t('common.source')}</th>
                </tr>
              </thead>
              <tbody>
                {season.rows.map((r) => (
                  <tr key={r.crop} className="border-b last:border-0 dark:border-gray-800">
                    <td className="py-1.5 pr-2">{localName(r, lng)}</td>
                    <td className="py-1.5 pr-2 text-right font-medium">{formatMoney(r.msp_inr_per_quintal, lng)}</td>
                    <td className="py-1.5 pr-2 text-right">
                      {r.increase_over_previous !== undefined ? `+${formatMoney(r.increase_over_previous, lng)}` : '—'}
                    </td>
                    <td className="py-1.5">
                      <a href={r.source_url} target="_blank" rel="noreferrer noopener" className="underline">
                        PIB {formatDate(r.announced_on, lng)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('msp.frpTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {query.data.sugarcane_frp.map((f) => (
            <p key={f.sugar_season}>
              {t('msp.frpLine', {
                season: f.sugar_season,
                price: formatMoney(f.frp_inr_per_quintal, lng),
                recovery: f.basic_recovery_rate_pct,
              })}{' '}
              <ExtLink href={f.source_url}>{t('common.source')}</ExtLink>
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('msp.notesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm">{t('msp.noMspCrops')}</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-400" lang="en">
            {query.data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            {t('msp.unit')} · {t('common.lastVerified', { date: formatDate(query.data.last_verified, lng) })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const GovernmentSchemes: React.FC = () => {
  const { t } = useTranslation('agro');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'msp' ? 'msp' : 'schemes';
  return (
    <AppShell>
      <PageHeader title={t('schemes.title')} subtitle={t('schemes.subtitle')} />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'msp' ? { tab: 'msp' } : {}, { replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="schemes">
            <Landmark className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('schemes.tab')}
          </TabsTrigger>
          <TabsTrigger value="msp">{t('msp.tab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="schemes">
          <SchemesList />
        </TabsContent>
        <TabsContent value="msp">
          <MSPTable />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default GovernmentSchemes;
