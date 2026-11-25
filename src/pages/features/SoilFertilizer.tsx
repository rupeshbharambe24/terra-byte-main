import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, MapPin, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Caution, SourceNote } from '@/components/agro/SourceNote';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  agroApi,
  CARRIERS,
  CROP_KEYS,
  SOIL_VALUE_KEYS,
  toCropKey,
  type Amount,
  type Carrier,
  type DoseResult,
  type RDFOption,
  type SoilTest,
  type SoilTestInput,
  type SoilValueKey,
} from '@/lib/agro';
import { farmApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { FIELDS_KEY, parseOptionalNumber } from '@/lib/farm';
import { formatDate, formatMoney, formatNumber, todayIST } from '@/lib/format';

const NONE = 'none';

/** Readable label for an RDF entry's season/condition key (raw text when not translated). */
function useConditionLabel() {
  const { t } = useTranslation('agro');
  return (o: Pick<RDFOption, 'season' | 'condition' | 'variety_type'>) =>
    [o.season, o.condition, o.variety_type]
      .filter(Boolean)
      .map((v) => t(`seasons.${v}`, { defaultValue: t(`conditions.${v}`, { defaultValue: String(v).replace(/_/g, ' ') }) }))
      .join(' · ');
}

// ---- Soil test form ------------------------------------------------------------------------------

const emptyForm = () => ({
  test_date: todayIST(),
  lab: '',
  p_basis: 'P' as 'P' | 'P2O5',
  k_basis: 'K' as 'K' | 'K2O',
  values: Object.fromEntries(SOIL_VALUE_KEYS.map((k) => [k, ''])) as Record<SoilValueKey, string>,
});

const SoilTestForm: React.FC<{ fieldId: number; onSaved: (t: SoilTest) => void }> = ({ fieldId, onSaved }) => {
  const { t } = useTranslation(['agro', 'common']);
  const [form, setForm] = useState(emptyForm);
  const parsed = Object.fromEntries(
    SOIL_VALUE_KEYS.map((k) => [k, parseOptionalNumber(form.values[k])])
  ) as Record<SoilValueKey, number | null>;
  const invalid = Object.values(parsed).some((v) => v !== null && (Number.isNaN(v) || v < 0));
  const empty = Object.values(parsed).every((v) => v === null);
  const save = useMutation({
    mutationFn: () => {
      const body: Partial<SoilTestInput> = {
        test_date: form.test_date,
        lab: form.lab.trim() || null,
        p_basis: form.p_basis,
        k_basis: form.k_basis,
        ...parsed,
      };
      return agroApi.createSoilTest(fieldId, body);
    },
    onSuccess: (test) => {
      toast.success(t('soil.saved'));
      setForm(emptyForm());
      onSaved(test);
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  const input = (k: SoilValueKey) => (
    <div key={k} className="space-y-1">
      <Label htmlFor={`soil-${k}`}>{t(`soil.fields.${k}`)}</Label>
      <Input
        id={`soil-${k}`}
        inputMode="decimal"
        value={form.values[k]}
        aria-invalid={parsed[k] !== null && Number.isNaN(parsed[k])}
        onChange={(e) => setForm((f) => ({ ...f, values: { ...f.values, [k]: e.target.value } }))}
      />
    </div>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid && !empty) save.mutate();
      }}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{t('soil.formHint')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="soil-date">{t('soil.testDate')}</Label>
          <Input
            id="soil-date"
            type="date"
            max={todayIST()}
            value={form.test_date}
            onChange={(e) => setForm((f) => ({ ...f, test_date: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="soil-lab">{t('soil.lab')}</Label>
          <Input id="soil-lab" maxLength={160} value={form.lab} onChange={(e) => setForm((f) => ({ ...f, lab: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {input('n_kg_ha')}
        {input('p_kg_ha')}
        <div className="space-y-1">
          <Label htmlFor="soil-pbasis">{t('soil.pBasis')}</Label>
          <Select value={form.p_basis} onValueChange={(v) => setForm((f) => ({ ...f, p_basis: v as 'P' | 'P2O5' }))}>
            <SelectTrigger id="soil-pbasis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P">{t('soil.basisP')}</SelectItem>
              <SelectItem value="P2O5">{t('soil.basisP2O5')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {input('k_kg_ha')}
        <div className="space-y-1">
          <Label htmlFor="soil-kbasis">{t('soil.kBasis')}</Label>
          <Select value={form.k_basis} onValueChange={(v) => setForm((f) => ({ ...f, k_basis: v as 'K' | 'K2O' }))}>
            <SelectTrigger id="soil-kbasis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="K">{t('soil.basisK')}</SelectItem>
              <SelectItem value="K2O">{t('soil.basisK2O')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(['oc_pct', 'ph', 'ec_ds_m', 's_ppm', 'zn_ppm', 'fe_ppm', 'mn_ppm', 'cu_ppm', 'b_ppm'] as SoilValueKey[]).map(input)}
      </div>
      {invalid && <p className="text-sm text-red-600">{t('soil.invalid')}</p>}
      <Button type="submit" className="bg-green-600 text-white hover:bg-green-700" disabled={invalid || empty || save.isPending}>
        {save.isPending ? t('soil.saving') : t('soil.save')}
      </Button>
    </form>
  );
};

// ---- Result --------------------------------------------------------------------------------------

const AmountCells: React.FC<{ a: Amount; field: boolean }> = ({ a, field }) => {
  const { i18n } = useTranslation();
  const lng = i18n.resolvedLanguage;
  return (
    <>
      <td className="py-1.5 pr-2 text-right">{formatNumber(a.per_ha, lng, 1)}</td>
      <td className="py-1.5 pr-2 text-right">{formatNumber(a.per_acre, lng, 1)}</td>
      {field && <td className="py-1.5 text-right">{formatNumber(a.per_field, lng, 1)}</td>}
    </>
  );
};

const DoseView: React.FC<{ dose: DoseResult }> = ({ dose }) => {
  const { t, i18n } = useTranslation('agro');
  const lng = i18n.resolvedLanguage;
  const label = useConditionLabel();
  const hasField = dose.area_acres !== null;
  const head = (
    <>
      <th className="py-2 pr-2 text-right font-medium">{t('fert.perHa')}</th>
      <th className="py-2 pr-2 text-right font-medium">{t('fert.perAcre')}</th>
      {hasField && (
        <th className="py-2 text-right font-medium">{t('fert.perField', { acres: formatNumber(dose.area_acres, lng, 2) })}</th>
      )}
    </>
  );
  return (
    <div className="space-y-4">
      <Caution title={t('fert.disclaimerTitle')}>{t('fert.disclaimer')}</Caution>
      {dose.notes.map((n) => (
        <Caution key={n}>{t(`fert.notes.${n}`)}</Caution>
      ))}

      {dose.ratings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t('fert.ratingsTitle', { date: formatDate(dose.soil_test_date, lng) })}
            </CardTitle>
            <p className="text-xs text-gray-500">{t(`fert.scheme.${dose.scheme}`)}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-2 font-medium">{t('fert.nutrient')}</th>
                  <th className="py-2 pr-2 text-right font-medium">{t('fert.entered')}</th>
                  <th className="py-2 pr-2 font-medium">{t('fert.class')}</th>
                  <th className="py-2 text-right font-medium">{t('fert.adjustment')}</th>
                </tr>
              </thead>
              <tbody>
                {dose.ratings.map((r) => (
                  <tr key={r.nutrient} className="border-b last:border-0 dark:border-gray-800">
                    <td className="py-1.5 pr-2">{t(`fert.nutrients.${r.nutrient}`)}</td>
                    <td className="py-1.5 pr-2 text-right">
                      {r.entered === null ? '—' : `${formatNumber(r.entered, lng, 2)} ${r.basis === '%' ? '%' : `kg/ha ${r.basis}`}`}
                    </td>
                    <td className="py-1.5 pr-2">{r.class ? t(`fert.classes.${r.class}`) : t('fert.notEntered')}</td>
                    <td className="py-1.5 text-right">
                      {r.factor === null ? '—' : r.factor === 1 ? t('fert.rdfAsIs') : `×${formatNumber(r.factor, lng, 2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">{t('fert.pBasisNote')}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('fert.doseTitle')}</CardTitle>
          <p className="text-xs text-gray-500">
            {t('fert.rdfLine', {
              crop: t(`crops.${dose.crop}`),
              label: label(dose.rdf),
              n: formatNumber(dose.rdf.n_kg_ha, lng, 1),
              p: formatNumber(dose.rdf.p2o5_kg_ha, lng, 1),
              k: formatNumber(dose.rdf.k2o_kg_ha, lng, 1),
            })}
            {dose.rdf.status === 'partial' && <Badge variant="outline" className="ml-2">{t('fert.partial')}</Badge>}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pr-2 font-medium">{t('fert.nutrient')} (kg)</th>
                {head}
              </tr>
            </thead>
            <tbody>
              {(['n', 'p2o5', 'k2o'] as const).map((k) => (
                <tr key={k} className="border-b last:border-0 dark:border-gray-800">
                  <td className="py-1.5 pr-2">{t(`fert.oxides.${k}`)}</td>
                  <AmountCells a={dose.dose[k]} field={hasField} />
                </tr>
              ))}
            </tbody>
          </table>
          {dose.rdf.fym_t_ha !== null && (
            <p className="mt-2 text-sm">{t('fert.fym', { t: formatNumber(dose.rdf.fym_t_ha, lng, 1) })}</p>
          )}
          {dose.rdf.notes.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs text-gray-600 dark:text-gray-400" lang="en">
              {dose.rdf.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('fert.productsTitle')}</CardTitle>
          <p className="text-xs text-gray-500">{t(`fert.carrierHelp.${dose.carrier}`)}</p>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pr-2 font-medium">{t('fert.product')}</th>
                <th className="py-2 pr-2 text-right font-medium">{t('fert.kgAcre')}</th>
                {hasField && <th className="py-2 pr-2 text-right font-medium">{t('fert.kgField')}</th>}
                <th className="py-2 pr-2 text-right font-medium">{t('fert.bags')}</th>
                <th className="py-2 text-right font-medium">{t('fert.cost')}</th>
              </tr>
            </thead>
            <tbody>
              {dose.products.map((p) => (
                <tr key={p.key} className="border-b last:border-0 dark:border-gray-800">
                  <td className="py-1.5 pr-2">
                    {t(`fert.products.${p.key}`)} <span className="text-xs text-gray-500">({p.grade})</span>
                  </td>
                  <td className="py-1.5 pr-2 text-right">{formatNumber(p.kg.per_acre, lng, 1)}</td>
                  {hasField && <td className="py-1.5 pr-2 text-right">{formatNumber(p.kg.per_field, lng, 1)}</td>}
                  <td className="py-1.5 pr-2 text-right">
                    {p.bag_kg
                      ? t('fert.bagCount', {
                          count: hasField ? (p.bags_field ?? 0) : (p.bags_per_acre ?? 0),
                          n: formatNumber(hasField ? p.bags_field : p.bags_per_acre, lng, 1),
                          kg: p.bag_kg,
                        })
                      : t('fert.bagUnknown')}
                  </td>
                  <td className="py-1.5 text-right">
                    {p.price_inr_per_bag !== null ? (
                      <span title={p.price_source ?? ''}>
                        {formatMoney(hasField ? p.cost_field_inr : p.cost_per_acre_inr, lng)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{t('fert.companyPrice')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.entries(dose.excess).map(([nutrient, a]) => (
            <p key={nutrient} className="text-xs text-amber-700 dark:text-amber-300">
              {t('fert.excess', { nutrient, kg: formatNumber(a.per_acre, lng, 1) })}
            </p>
          ))}
          <p className="text-xs text-gray-500">
            {t('fert.priceNote')}{' '}
            {dose.products
              .filter((p) => p.price_source_url)
              .map((p) => (
                <a key={p.key} href={p.price_source_url!} target="_blank" rel="noreferrer noopener" className="mr-2 underline">
                  {t(`fert.products.${p.key}`)} ({p.price_as_of})
                </a>
              ))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('fert.splitTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dose.splits.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('fert.noSplit')}</p>
          ) : (
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-2 font-medium">{t('fert.when')}</th>
                  {dose.products.map((p) => (
                    <th key={p.key} className="py-2 pr-2 text-right font-medium">
                      {t(`fert.products.${p.key}`)} ({hasField ? t('fert.kgField') : t('fert.kgAcre')})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dose.splits.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 dark:border-gray-800">
                    <td className="py-1.5 pr-2" lang="en">
                      {s.timing}
                      {s.text && <span className="block text-xs text-gray-500">{s.text}</span>}
                    </td>
                    {dose.products.map((p) => {
                      const a = s.products[p.key];
                      return (
                        <td key={p.key} className="py-1.5 pr-2 text-right">
                          {a ? formatNumber(hasField ? a.per_field : a.per_acre, lng, 1) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {dose.micronutrients.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('fert.microTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {dose.micronutrients.map((m) => (
                <li key={m.nutrient} className={m.deficient ? 'font-medium text-red-700 dark:text-red-300' : ''}>
                  {t(m.deficient ? 'fert.microDeficient' : 'fert.microOk', {
                    nutrient: m.nutrient,
                    value: formatNumber(m.value_ppm, lng, 2),
                    limit: formatNumber(m.critical_limit_ppm, lng, 2),
                  })}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-500">{t('fert.microAdvice')}</p>
          </CardContent>
        </Card>
      )}

      <SourceNote sources={dose.sources} lastVerified={dose.last_verified} />
    </div>
  );
};

// ---- Page ----------------------------------------------------------------------------------------

const SoilFertilizer: React.FC = () => {
  const { t, i18n } = useTranslation(['agro', 'common']);
  const lng = i18n.resolvedLanguage;
  const queryClient = useQueryClient();
  const label = useConditionLabel();
  const fields = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [crop, setCrop] = useState<string>('');
  const [rdfId, setRdfId] = useState<string>('');
  const [scheme, setScheme] = useState<'mpkv' | 'national'>('mpkv');
  const [carrier, setCarrier] = useState<Carrier>('dap');
  const [testId, setTestId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

  const field = fields.data?.find((f) => f.id === fieldId) ?? null;
  useEffect(() => {
    if (fieldId === null && fields.data && fields.data.length > 0) setFieldId(fields.data[0].id);
  }, [fields.data, fieldId]);
  useEffect(() => {
    setCrop(toCropKey(field?.current_crop) ?? '');
    setTestId('');
  }, [field?.id, field?.current_crop]);

  const tests = useQuery({
    queryKey: ['soil-tests', fieldId],
    queryFn: () => agroApi.soilTests(fieldId!),
    enabled: fieldId !== null,
  });
  useEffect(() => {
    if (testId === '' && tests.data) setTestId(tests.data.length > 0 ? String(tests.data[0].id) : NONE);
  }, [tests.data, testId]);

  const options = useQuery({
    queryKey: ['fertilizer-options', crop],
    queryFn: () => agroApi.fertilizerOptions(crop),
    enabled: crop !== '',
  });
  const usable = useMemo(() => (options.data?.options ?? []).filter((o) => o.usable), [options.data]);
  const flagged = useMemo(() => (options.data?.options ?? []).filter((o) => !o.usable), [options.data]);
  useEffect(() => {
    setRdfId(usable.length > 0 ? String(usable.find((o) => o.status === 'complete')?.id ?? usable[0].id) : '');
  }, [usable]);

  const doseInput = {
    crop,
    rdf_id: rdfId ? Number(rdfId) : null,
    field_id: fieldId,
    soil_test_id: testId && testId !== NONE ? Number(testId) : null,
    scheme,
    carrier,
  };
  const dose = useQuery({
    queryKey: ['dose', doseInput],
    queryFn: () => agroApi.dose(doseInput),
    enabled: crop !== '' && rdfId !== '' && fieldId !== null && testId !== '',
  });

  const remove = useMutation({
    mutationFn: (id: number) => agroApi.deleteSoilTest(id),
    onSuccess: () => {
      setTestId('');
      void queryClient.invalidateQueries({ queryKey: ['soil-tests'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const selectedTest = tests.data?.find((x) => String(x.id) === testId);

  return (
    <AppShell>
      <PageHeader title={t('soil.title')} subtitle={t('soil.subtitle')} />
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="space-y-1">
                  <Label htmlFor="sf-field">{t('common.field')}</Label>
                  <Select value={fieldId ? String(fieldId) : ''} onValueChange={(v) => setFieldId(Number(v))}>
                    <SelectTrigger id="sf-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.data.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name} ({formatNumber(f.area_acres, lng, 2)} {t('common.acres')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sf-test">{t('soil.useTest')}</Label>
                  <Select value={testId} onValueChange={setTestId}>
                    <SelectTrigger id="sf-test">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t('soil.noTest')}</SelectItem>
                      {(tests.data ?? []).map((x) => (
                        <SelectItem key={x.id} value={String(x.id)}>
                          {formatDate(x.test_date, lng)}
                          {x.lab ? ` · ${x.lab}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
                      <FlaskConical className="mr-1 h-4 w-4" aria-hidden="true" />
                      {t('soil.add')}
                    </Button>
                    {selectedTest && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => remove.mutate(selectedTest.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                        {t('soil.delete')}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sf-crop">{t('common.crop')}</Label>
                  <Select value={crop} onValueChange={setCrop}>
                    <SelectTrigger id="sf-crop">
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
                {crop && usable.length > 0 && (
                  <div className="space-y-1">
                    <Label htmlFor="sf-rdf">{t('fert.recommendation')}</Label>
                    <Select value={rdfId} onValueChange={setRdfId}>
                      <SelectTrigger id="sf-rdf">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {usable.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {label(o)} — {o.n_kg_ha}:{o.p2o5_kg_ha}:{o.k2o_kg_ha}
                            {o.status === 'partial' ? ` (${t('fert.partial')})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="sf-scheme">{t('fert.ratingTable')}</Label>
                  <Select value={scheme} onValueChange={(v) => setScheme(v as 'mpkv' | 'national')}>
                    <SelectTrigger id="sf-scheme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpkv">{t('fert.schemeShort.mpkv')}</SelectItem>
                      <SelectItem value="national">{t('fert.schemeShort.national')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sf-carrier">{t('fert.carrier')}</Label>
                  <Select value={carrier} onValueChange={(v) => setCarrier(v as Carrier)}>
                    <SelectTrigger id="sf-carrier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`fert.products.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            {flagged.length > 0 && (
              <Caution title={t('fert.flaggedTitle')}>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {flagged.map((o) => (
                    <li key={o.id}>
                      {label(o)}: {t(`fert.reasons.${o.reason}`)}
                    </li>
                  ))}
                </ul>
              </Caution>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {showForm && fieldId !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('soil.add')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SoilTestForm
                    fieldId={fieldId}
                    onSaved={(test) => {
                      setShowForm(false);
                      void queryClient.invalidateQueries({ queryKey: ['soil-tests'] });
                      setTestId(String(test.id));
                    }}
                  />
                </CardContent>
              </Card>
            )}
            {!crop ? (
              <EmptyState icon={FlaskConical} title={t('fert.chooseCrop')} />
            ) : options.isLoading ? (
              <PageSpinner />
            ) : usable.length === 0 ? (
              <EmptyState icon={FlaskConical} title={t('fert.noRdf')} body={t('fert.noRdfBody')} />
            ) : dose.isLoading ? (
              <PageSpinner />
            ) : dose.isError ? (
              <ErrorAlert error={dose.error} />
            ) : dose.data ? (
              <DoseView dose={dose.data} />
            ) : null}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default SoilFertilizer;
