import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import PageSpinner from '@/components/common/PageSpinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { farmApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { FIELDS_KEY, fromAcres, isInIndia, parseOptionalNumber, roundCoord, toAcres, type AreaUnit } from '@/lib/farm';
import { acresToGuntha, acresToHectares, formatDate, formatNumber } from '@/lib/format';
import type { FieldInput, FieldPlot } from '@/lib/types';
import LocationButton from './LocationButton';

interface FormState {
  name: string;
  area: string;
  unit: AreaUnit;
  soil_type: string;
  irrigation_source: string;
  current_crop: string;
  sowing_date: string;
  lat: string;
  lon: string;
}

const emptyForm: FormState = {
  name: '',
  area: '',
  unit: 'acres',
  soil_type: '',
  irrigation_source: '',
  current_crop: '',
  sowing_date: '',
  lat: '',
  lon: '',
};

function formFrom(field: FieldPlot): FormState {
  return {
    name: field.name,
    area: String(fromAcres(field.area_acres, 'acres')),
    unit: 'acres',
    soil_type: field.soil_type ?? '',
    irrigation_source: field.irrigation_source ?? '',
    current_crop: field.current_crop ?? '',
    sowing_date: field.sowing_date ?? '',
    lat: field.lat === null ? '' : String(field.lat),
    lon: field.lon === null ? '' : String(field.lon),
  };
}

/** "2.5 acres · 100 guntha · 1.01 ha" */
export const AreaText: React.FC<{ acres: number }> = ({ acres }) => {
  const { t, i18n } = useTranslation(['farm', 'common']);
  const lng = i18n.resolvedLanguage;
  return (
    <span>
      {t('fields.areaSummary', {
        acres: formatNumber(acres, lng),
        guntha: formatNumber(acresToGuntha(acres), lng, 1),
        hectares: formatNumber(acresToHectares(acres), lng),
      })}
    </span>
  );
};

const FieldDialog: React.FC<{
  open: boolean;
  field: FieldPlot | null;
  onOpenChange: (open: boolean) => void;
}> = ({ open, field, onOpenChange }) => {
  const { t } = useTranslation(['farm', 'common']);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(field ? formFrom(field) : emptyForm);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const changeUnit = (unit: AreaUnit) => {
    setForm((f) => {
      const value = parseOptionalNumber(f.area);
      if (value === null || Number.isNaN(value)) return { ...f, unit };
      return { ...f, unit, area: String(fromAcres(toAcres(value, f.unit), unit)) };
    });
  };

  const mutation = useMutation({
    mutationFn: (data: FieldInput) => (field ? farmApi.updateField(field.id, data) : farmApi.createField(data)),
    onSuccess: () => {
      toast.success(t('fields.saved'));
      void queryClient.invalidateQueries({ queryKey: FIELDS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onOpenChange(false);
    },
    onError: (err) => setError(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = form.name.trim();
    if (!name) return setError(t('fields.nameRequired'));
    const area = parseOptionalNumber(form.area);
    if (area === null || Number.isNaN(area) || area <= 0) return setError(t('fields.areaInvalid'));
    const lat = parseOptionalNumber(form.lat);
    const lon = parseOptionalNumber(form.lon);
    if ((lat === null) !== (lon === null) || (lat !== null && lon !== null && !isInIndia(lat, lon))) {
      return setError(t('location.invalid'));
    }
    mutation.mutate({
      name,
      area_acres: Math.round(toAcres(area, form.unit) * 10000) / 10000,
      soil_type: form.soil_type.trim() || null,
      irrigation_source: form.irrigation_source.trim() || null,
      current_crop: form.current_crop.trim() || null,
      sowing_date: form.sowing_date || null,
      lat: lat === null ? null : roundCoord(lat),
      lon: lon === null ? null : roundCoord(lon),
    });
  };

  const prefix = field ? `field-${field.id}` : 'field-new';
  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? t('fields.editTitle') : t('fields.addTitle')}</DialogTitle>
          <DialogDescription>{t('fields.dialogHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-name`}>{t('fields.name')}</Label>
            <Input id={`${prefix}-name`} value={form.name} maxLength={120} onChange={set('name')} required />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-area`}>{t('fields.area')}</Label>
              <Input id={`${prefix}-area`} inputMode="decimal" value={form.area} onChange={set('area')} required />
            </div>
            <Select value={form.unit} onValueChange={(v) => changeUnit(v as AreaUnit)}>
              <SelectTrigger className="w-32" aria-label={t('fields.unit')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acres">{t('common:units.acres')}</SelectItem>
                <SelectItem value="guntha">{t('common:units.guntha')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">{t('fields.gunthaHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-crop`}>{t('fields.crop')}</Label>
              <Input id={`${prefix}-crop`} value={form.current_crop} maxLength={80} onChange={set('current_crop')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-sowing`}>{t('fields.sowingDate')}</Label>
              <Input id={`${prefix}-sowing`} type="date" value={form.sowing_date} onChange={set('sowing_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-soil`}>{t('fields.soilType')}</Label>
              <Input
                id={`${prefix}-soil`}
                value={form.soil_type}
                maxLength={60}
                placeholder={t('fields.soilPlaceholder')}
                onChange={set('soil_type')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-irrigation`}>{t('fields.irrigation')}</Label>
              <Input
                id={`${prefix}-irrigation`}
                value={form.irrigation_source}
                maxLength={60}
                placeholder={t('fields.irrigationPlaceholder')}
                onChange={set('irrigation_source')}
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('location.title')}</legend>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label={t('location.lat')}
                placeholder={t('location.lat')}
                inputMode="decimal"
                value={form.lat}
                onChange={set('lat')}
              />
              <Input
                aria-label={t('location.lon')}
                placeholder={t('location.lon')}
                inputMode="decimal"
                value={form.lon}
                onChange={set('lon')}
              />
            </div>
            <LocationButton
              onLocate={({ lat, lon }) => setForm((f) => ({ ...f, lat: String(lat), lon: String(lon) }))}
            />
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={mutation.isPending}>
              {mutation.isPending ? t('common:actions.saving') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** The farmer's fields with add / edit / delete. */
const FieldsCard: React.FC = () => {
  const { t, i18n } = useTranslation(['farm', 'common']);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FieldPlot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [deleting, setDeleting] = useState<FieldPlot | null>(null);
  const { data, isLoading, isError, error } = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });

  const remove = useMutation({
    mutationFn: (id: number) => farmApi.deleteField(id),
    onSuccess: () => {
      toast.success(t('fields.deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: FIELDS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const openDialog = (field: FieldPlot | null) => {
    setEditing(field);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{t('fields.title')}</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('fields.subtitle')}</p>
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openDialog(null)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('fields.add')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <ErrorAlert error={error} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={MapPin} title={t('fields.empty')} body={t('fields.emptyBody')} />
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {data.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white break-words">{f.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <AreaText acres={f.area_acres} />
                  </p>
                  <p className="text-sm text-gray-500">
                    {[
                      f.current_crop,
                      f.sowing_date ? t('fields.sownOn', { date: formatDate(f.sowing_date, i18n.resolvedLanguage) }) : null,
                      f.soil_type,
                      f.irrigation_source,
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('fields.noDetails')}
                  </p>
                  {f.lat !== null && f.lon !== null && (
                    <p className="text-xs text-gray-500">
                      {f.lat}, {f.lon}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openDialog(f)}>
                    <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('common:actions.edit')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleting(f)} aria-label={t('fields.deleteNamed', { name: f.name })}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <FieldDialog key={dialogKey} open={dialogOpen} field={editing} onOpenChange={setDialogOpen} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('fields.deleteTitle', { name: deleting?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('fields.deleteBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {t('common:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default FieldsCard;
