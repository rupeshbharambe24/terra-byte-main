import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Caution, ExtLink } from '@/components/agro/SourceNote';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import {
  agroApi,
  CROP_KEYS,
  formatMonthDay,
  localName,
  rangeText,
  toCropKey,
  type CalendarEntry,
  type CalendarItem,
  type CropCalendar,
} from '@/lib/agro';
import { farmApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { FIELDS_KEY } from '@/lib/farm';
import { formatDate, formatMoney } from '@/lib/format';
import type { FieldPlot } from '@/lib/types';

const GROUPS = ['all', 'kharif', 'rabi', 'summer', 'other'] as const;
type Group = (typeof GROUPS)[number];

const EntryDetails: React.FC<{ e: CalendarEntry; district: string | null }> = ({ e, district }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const duration = rangeText(e.duration_days);
  const seed = rangeText(e.seed_rate_kg_ha);
  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="text-gray-500">{t('plan.sowing')}: </span>
        {e.sowing_window?.start
          ? `${formatMonthDay(e.sowing_window.start, lng)} – ${formatMonthDay(e.sowing_window.end, lng)}`
          : t('plan.notGiven')}
      </p>
      {duration && (
        <p>
          <span className="text-gray-500">{t('plan.duration')}: </span>
          {t('plan.days', { days: duration })}
        </p>
      )}
      {seed && (
        <p>
          <span className="text-gray-500">{t('plan.seedRate')}: </span>
          {seed} kg/ha
        </p>
      )}
      {e.spacing_cm && (
        <p lang="en">
          <span className="text-gray-500">{t('plan.spacing')}: </span>
          {e.spacing_cm}
        </p>
      )}
      {(e.sowing_window?.text || e.sowing_trigger) && (
        <p className="text-xs text-gray-600 dark:text-gray-400" lang="en">
          {e.sowing_window?.text ?? ''} {e.sowing_trigger ?? ''}
        </p>
      )}
      <p className="text-xs text-gray-500">
        <Badge variant="outline" className="mr-1">
          {t(`plan.scope.${e.scope}`, { district: district ?? '' })}
        </Badge>
        {e.source_url ? <ExtLink href={e.source_url}>{e.source_name}</ExtLink> : e.source_name}
        {e.source_page ? ` (${e.source_page})` : ''}
      </p>
    </div>
  );
};

const CropCard: React.FC<{ item: CalendarItem; district: string | null }> = ({ item, district }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const [more, setMore] = useState(false);
  const [best, ...rest] = item.entries;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {t(`crops.${item.crop}`)}{' '}
          <span className="text-sm font-normal text-gray-500">
            · {t(`seasons.${item.season}`, { defaultValue: item.season.replace(/_/g, ' ') })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <EntryDetails e={best} district={district} />
        {rest.length > 0 && (
          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setMore((v) => !v)}>
            {more ? t('plan.hideSources') : t('plan.moreSources', { count: rest.length })}
          </Button>
        )}
        {more && (
          <div className="space-y-3 border-l-2 pl-3 dark:border-gray-700">
            {rest.map((e) => (
              <EntryDetails key={e.key} e={e} district={district} />
            ))}
          </div>
        )}
        <div className="border-t pt-2 text-sm dark:border-gray-700">
          {item.msp.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">{t('plan.noMsp')}</p>
          ) : (
            item.msp.map((m) => (
              <p key={m.crop}>
                {t('plan.msp', {
                  crop: localName(m, lng),
                  price: formatMoney(m.msp_inr_per_quintal, lng),
                  year: m.marketing_year,
                })}{' '}
                <ExtLink href={m.source_url}>{t('common.source')}</ExtLink>
              </p>
            ))
          )}
          {!item.irrigation_supported && <p className="text-xs text-gray-500">{t('plan.noIrrigationData')}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

const FieldPlanRow: React.FC<{ field: FieldPlot; calendar: CropCalendar }> = ({ field, calendar }) => {
  const { t } = useTranslation(['agro', 'common']);
  const queryClient = useQueryClient();
  const [crop, setCrop] = useState<string>(toCropKey(field.current_crop) ?? '');
  const [season, setSeason] = useState<string>(field.season ?? '');
  const [sowing, setSowing] = useState<string>(field.sowing_date ?? '');
  const seasons = useMemo(
    () => calendar.items.filter((i) => i.crop === crop).map((i) => i.season),
    [calendar.items, crop]
  );
  const save = useMutation({
    mutationFn: () =>
      farmApi.updateField(field.id, {
        current_crop: crop || null,
        season: season || null,
        sowing_date: sowing || null,
      }),
    onSuccess: () => {
      toast.success(t('plan.saved'));
      void queryClient.invalidateQueries({ queryKey: FIELDS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['irrigation'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  const unknownCrop = field.current_crop && !toCropKey(field.current_crop);
  return (
    <div className="space-y-2 border-b pb-3 last:border-0 dark:border-gray-700">
      <p className="font-medium">{field.name}</p>
      {unknownCrop && <p className="text-xs text-amber-700">{t('plan.freeText', { crop: field.current_crop })}</p>}
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={`plan-crop-${field.id}`}>{t('common.crop')}</Label>
          <Select
            value={crop}
            onValueChange={(v) => {
              setCrop(v);
              setSeason('');
            }}
          >
            <SelectTrigger id={`plan-crop-${field.id}`}>
              <SelectValue placeholder={t('common.chooseCrop')} />
            </SelectTrigger>
            <SelectContent>
              {CROP_KEYS.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`crops.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`plan-season-${field.id}`}>{t('plan.season')}</Label>
          <Select value={season} onValueChange={setSeason} disabled={seasons.length === 0}>
            <SelectTrigger id={`plan-season-${field.id}`}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`seasons.${s}`, { defaultValue: s.replace(/_/g, ' ') })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`plan-sow-${field.id}`}>{t('plan.sowingDate')}</Label>
          <Input id={`plan-sow-${field.id}`} type="date" value={sowing} onChange={(e) => setSowing(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full bg-green-600 text-white hover:bg-green-700"
            disabled={save.isPending || !crop}
            onClick={() => save.mutate()}
          >
            {t('plan.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const CropPlanning: React.FC = () => {
  const { t } = useTranslation(['agro', 'common']);
  const { user } = useAuth();
  const [district, setDistrict] = useState<string>(user?.district ?? '');
  const [group, setGroup] = useState<Group>('all');
  useEffect(() => {
    if (!district && user?.district) setDistrict(user.district);
  }, [user?.district, district]);
  const calendar = useQuery({
    queryKey: ['crop-calendar', district],
    queryFn: () => agroApi.calendar(district || undefined),
    placeholderData: keepPreviousData,
  });
  const fields = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });
  const items = (calendar.data?.items ?? []).filter((i) => group === 'all' || i.season_group === group);

  return (
    <AppShell>
      <PageHeader title={t('plan.title')} subtitle={t('plan.subtitle')} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1 sm:w-64">
          <Label htmlFor="plan-district">{t('plan.district')}</Label>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger id="plan-district">
              <SelectValue placeholder={t('plan.chooseDistrict')} />
            </SelectTrigger>
            <SelectContent>
              {MAHARASHTRA_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {calendar.data?.region && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('plan.region', { region: t(`regions.${calendar.data.region}`) })}
          </p>
        )}
      </div>

      {calendar.isLoading ? (
        <PageSpinner />
      ) : calendar.isError ? (
        <ErrorAlert error={calendar.error} />
      ) : calendar.data ? (
        <div className="space-y-6">
          {fields.data && fields.data.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('plan.myFields')}</CardTitle>
                <p className="text-xs text-gray-500">{t('plan.myFieldsHint')}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.data.map((f) => (
                  <FieldPlanRow key={f.id} field={f} calendar={calendar.data} />
                ))}
              </CardContent>
            </Card>
          )}

          <Tabs value={group} onValueChange={(v) => setGroup(v as Group)}>
            <TabsList className="flex h-auto flex-wrap">
              {GROUPS.map((g) => (
                <TabsTrigger key={g} value={g}>
                  {t(`plan.groups.${g}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {items.length === 0 ? (
            <EmptyState icon={Sprout} title={t('plan.none')} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((i) => (
                <CropCard key={`${i.crop}-${i.season}`} item={i} district={calendar.data.district} />
              ))}
            </div>
          )}
          <Caution title={t('plan.caveatsTitle')}>
            <ul className="mt-1 list-disc space-y-1 pl-4" lang="en">
              {calendar.data.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              {t('common.lastVerified', { date: formatDate(calendar.data.last_verified, undefined) })}
            </p>
          </Caution>
        </div>
      ) : null}
    </AppShell>
  );
};

export default CropPlanning;
