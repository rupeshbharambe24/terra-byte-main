import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Droplets, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Caution, SourceNote, WeatherAttribution } from '@/components/agro/SourceNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WeatherError from '@/components/agro/WeatherError';
import { recommendationText } from '@/lib/agroText';
import { agroApi, SOIL_TEXTURES, type IrrigationData, type SoilTexture } from '@/lib/agro';
import { farmApi } from '@/lib/api';
import { FIELDS_KEY } from '@/lib/farm';
import { formatDate, formatNumber, todayIST } from '@/lib/format';

const AUTO = 'auto';

const Totals: React.FC<{ title: string; data: NonNullable<IrrigationData['next']> }> = ({ title, data }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const rows: [string, number][] = [
    ['et0', data.et0_mm],
    ['etc', data.etc_mm],
    ['rain', data.rain_mm],
    ['effectiveRain', data.effective_rain_mm],
    ['netNeed', data.net_need_mm],
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-gray-600 dark:text-gray-400">{t(`irrigation.totals.${k}`)}</dt>
              <dd className="text-right font-medium">{formatNumber(v, lng, 1)} mm</dd>
            </React.Fragment>
          ))}
          {data.litres_per_acre !== undefined && (
            <>
              <dt className="text-gray-600 dark:text-gray-400">{t('irrigation.totals.litresAcre')}</dt>
              <dd className="text-right font-medium">{formatNumber(data.litres_per_acre, lng, 0)} L</dd>
              <dt className="text-gray-600 dark:text-gray-400">{t('irrigation.totals.litresField')}</dt>
              <dd className="text-right font-medium">{formatNumber(data.litres_field ?? null, lng, 0)} L</dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
};

const IrrigationResult: React.FC<{ data: IrrigationData }> = ({ data }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  if (data.status !== 'ok') {
    return (
      <EmptyState
        icon={Droplets}
        title={recommendationText(t, data, lng)}
        body={t(`irrigation.statusBody.${data.status}`)}
        action={
          <Button asChild variant="outline">
            <Link to="/crop-planning">{t('irrigation.setPlan')}</Link>
          </Button>
        }
      />
    );
  }
  const p = data.params!;
  const urgent = data.recommendation?.kind === 'today';
  return (
    <div className="space-y-4">
      <Card className={urgent ? 'border-amber-400' : 'border-green-300'}>
        <CardContent className="space-y-1 p-4">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{recommendationText(t, data, lng)}</p>
          {data.recommendation?.litres_field !== null && data.recommendation?.litres_field !== undefined && (
            <p className="text-sm">
              {t('irrigation.forField', {
                litres: formatNumber(data.recommendation.litres_field, lng, 0),
                acres: formatNumber(data.area_acres, lng, 2),
              })}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('irrigation.cropLine', {
              crop: t(`crops.${data.crop}`),
              days: data.days_after_sowing,
              stage: t(`irrigation.stages.${data.stage}`),
              kc: formatNumber(data.kc ?? null, lng, 2),
            })}
          </p>
        </CardContent>
      </Card>

      {data.stale_weather && <Caution>{t('weather.staleShort')}</Caution>}

      <div className="grid gap-4 md:grid-cols-2">
        <Totals title={t('irrigation.next7')} data={data.next!} />
        <Totals title={t('irrigation.past7')} data={data.past!} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('irrigation.dailyTitle')}</CardTitle>
          <p className="text-xs text-gray-500">{t('irrigation.dailyHelp')}</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pr-2 font-medium">{t('irrigation.col.date')}</th>
                <th className="py-2 pr-2 text-right font-medium">Kc</th>
                <th className="py-2 pr-2 text-right font-medium">ET0</th>
                <th className="py-2 pr-2 text-right font-medium">ETc</th>
                <th className="py-2 pr-2 text-right font-medium">{t('irrigation.col.rain')}</th>
                <th className="py-2 pr-2 text-right font-medium">{t('irrigation.col.effRain')}</th>
                <th className="py-2 pr-2 text-right font-medium">{t('irrigation.col.depletion')}</th>
                <th className="py-2 text-right font-medium">{t('irrigation.col.raw')}</th>
              </tr>
            </thead>
            <tbody>
              {data.days!.map((d) => (
                <tr
                  key={d.date}
                  className={`border-b last:border-0 dark:border-gray-800 ${d.date === data.today ? 'bg-green-50 dark:bg-green-950' : ''}`}
                >
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    {formatDate(d.date, lng)}
                    {d.forecast && <span className="ml-1 text-xs text-gray-500">({t('irrigation.forecast')})</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(d.kc, lng, 2)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(d.et0_mm, lng, 1)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(d.etc_mm, lng, 1)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(d.rain_mm, lng, 1)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(d.effective_rain_mm, lng, 1)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(d.depletion_mm, lng, 1)}</td>
                  <td className="py-1.5 text-right">{formatNumber(d.raw_mm, lng, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Caution title={t('irrigation.assumptionsTitle')}>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {data.assumptions!.map((a) => (
            <li key={a}>
              {t(`irrigation.assumptions.${a}`, {
                date: formatDate(data.balance_start ?? null, lng),
                awc: formatNumber(data.soil?.awc_mm_per_m ?? null, lng, 0),
              })}
            </li>
          ))}
          {p.notes.map((note) => (
            <li key={note} lang="en">
              {note}
            </li>
          ))}
        </ul>
      </Caution>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('irrigation.paramsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            {t('irrigation.params', {
              name: p.fao56_name,
              ini: formatNumber(p.kc_ini, lng, 2),
              mid: formatNumber(p.kc_mid, lng, 2),
              end: formatNumber(p.kc_end, lng, 2),
              stages: p.stages_days.join(' + '),
              region: p.stage_region ?? '—',
              root: formatNumber(p.root_depth_max_m, lng, 2),
              p: formatNumber(p.p_table, lng, 2),
            })}
          </p>
          {p.is_proxy && <p className="text-amber-700 dark:text-amber-300">{t('irrigation.proxy')}</p>}
          <SourceNote sources={data.sources} />
          <WeatherAttribution />
        </CardContent>
      </Card>
    </div>
  );
};

const SmartIrrigation: React.FC = () => {
  const { t } = useTranslation(['agro', 'common']);
  const fields = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [texture, setTexture] = useState<string>(AUTO);
  const [lastIrrigated, setLastIrrigated] = useState('');

  useEffect(() => {
    if (fieldId === null && fields.data && fields.data.length > 0) {
      const withCrop = fields.data.find((f) => f.current_crop && f.sowing_date);
      setFieldId((withCrop ?? fields.data[0]).id);
    }
  }, [fields.data, fieldId]);

  const params = {
    soil_texture: texture === AUTO ? undefined : (texture as SoilTexture),
    last_irrigated: lastIrrigated || undefined,
  };
  const query = useQuery({
    queryKey: ['irrigation', fieldId, params],
    queryFn: () => agroApi.irrigation(fieldId!, params),
    enabled: fieldId !== null,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <AppShell>
      <PageHeader title={t('irrigation.title')} subtitle={t('irrigation.subtitle')} />
      {fields.isLoading ? (
        <PageSpinner />
      ) : fields.isError ? (
        <ErrorAlert error={fields.error} />
      ) : !fields.data || fields.data.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('common.noFields')}
          body={t('common.noFieldsBody')}
          action={
            <Button asChild variant="outline">
              <Link to="/settings">{t('common.openSettings')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="irr-field">{t('common.field')}</Label>
              <Select value={fieldId ? String(fieldId) : ''} onValueChange={(v) => setFieldId(Number(v))}>
                <SelectTrigger id="irr-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fields.data.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="irr-soil">{t('irrigation.soil')}</Label>
              <Select value={texture} onValueChange={setTexture}>
                <SelectTrigger id="irr-soil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO}>{t('irrigation.soilAuto')}</SelectItem>
                  {SOIL_TEXTURES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`irrigation.textures.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="irr-last">{t('irrigation.lastIrrigated')}</Label>
              <Input
                id="irr-last"
                type="date"
                max={todayIST()}
                value={lastIrrigated}
                onChange={(e) => setLastIrrigated(e.target.value)}
              />
            </div>
          </div>
          {query.isLoading ? (
            <PageSpinner />
          ) : query.isError ? (
            <WeatherError error={query.error} />
          ) : query.data ? (
            <IrrigationResult data={query.data} />
          ) : null}
        </div>
      )}
    </AppShell>
  );
};

export default SmartIrrigation;
