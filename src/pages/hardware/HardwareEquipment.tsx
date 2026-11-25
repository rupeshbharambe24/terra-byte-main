import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Tractor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import ImagePicker from '@/components/common/ImagePicker';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { RateLine } from '@/components/rentals/RentalBits';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { fileUrl, rentalsApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS, PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { EQUIPMENT_TYPES, type Equipment, type EquipmentInput, type EquipmentType } from '@/lib/types';

const NONE = 'none';

interface FormState {
  name: string;
  type: EquipmentType;
  hourly: string;
  daily: string;
  district: string;
  description: string;
  image_path: string | null;
}

/** Parse an optional rupee amount: '' -> null, invalid -> NaN. */
function parseRate(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : NaN;
}

const EquipmentDialog: React.FC<{ equipment: Equipment | null; onClose: () => void }> = ({ equipment, onClose }) => {
  const { t } = useTranslation(['rentals', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => ({
    name: equipment?.name ?? '',
    type: equipment?.type ?? 'tractor',
    hourly: equipment?.rate_per_hour_inr != null ? String(equipment.rate_per_hour_inr) : '',
    daily: equipment?.rate_per_day_inr != null ? String(equipment.rate_per_day_inr) : '',
    district: equipment?.district ?? user?.district ?? '',
    description: equipment?.description ?? '',
    image_path: equipment?.image_path ?? null,
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: EquipmentInput) =>
      equipment ? rentalsApi.updateEquipment(equipment.id, data) : rentalsApi.createEquipment(data),
    onSuccess: (saved) => {
      toast.success(t('equipment.saved', { name: saved.name }));
      void queryClient.invalidateQueries({ queryKey: ['equipment'] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const hourly = parseRate(form.hourly);
    const daily = parseRate(form.daily);
    if (form.name.trim().length < 2) return setFormError(t('equipment.form.nameRequired'));
    if (Number.isNaN(hourly) || Number.isNaN(daily)) return setFormError(t('equipment.form.invalidRate'));
    if (hourly === null && daily === null) return setFormError(t('equipment.form.needRate'));
    setFormError(null);
    mutation.mutate({
      name: form.name.trim(),
      type: form.type,
      rate_per_hour_inr: hourly,
      rate_per_day_inr: daily,
      district: form.district || null,
      description: form.description.trim() || null,
      image_path: form.image_path,
    });
  };

  // Keep a district that is not in the list (older listings) selectable.
  const districts = form.district && !(MAHARASHTRA_DISTRICTS as readonly string[]).includes(form.district)
    ? [form.district, ...MAHARASHTRA_DISTRICTS]
    : [...MAHARASHTRA_DISTRICTS];

  return (
    <Dialog open onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? t('equipment.form.titleEdit') : t('equipment.form.titleNew')}</DialogTitle>
          <DialogDescription>{t('equipment.form.description')}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="eq-name">{t('equipment.form.name')}</Label>
            <Input id="eq-name" value={form.name} maxLength={160} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-type">{t('equipment.form.type')}</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v as EquipmentType)}>
              <SelectTrigger id="eq-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map((ty) => (
                  <SelectItem key={ty} value={ty}>{t(`types.${ty}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eq-hourly">{t('equipment.form.ratePerHour')}</Label>
              <Input id="eq-hourly" type="number" inputMode="decimal" min={1} step="0.01" value={form.hourly} onChange={(e) => set('hourly', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-daily">{t('equipment.form.ratePerDay')}</Label>
              <Input id="eq-daily" type="number" inputMode="decimal" min={1} step="0.01" value={form.daily} onChange={(e) => set('daily', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-500">{t('equipment.form.rateHint')}</p>
          <div className="space-y-2">
            <Label htmlFor="eq-district">{t('equipment.form.district')}</Label>
            <Select value={form.district || NONE} onValueChange={(v) => set('district', v === NONE ? '' : v)}>
              <SelectTrigger id="eq-district"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('equipment.form.noDistrict')}</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-desc">{t('equipment.form.details')}</Label>
            <Textarea id="eq-desc" value={form.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} />
          </div>
          <ImagePicker label={t('equipment.form.photo')} value={form.image_path} onChange={(p) => set('image_path', p)} />
          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
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

const ActiveToggle: React.FC<{ equipment: Equipment }> = ({ equipment }) => {
  const { t } = useTranslation(['rentals', 'common']);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => rentalsApi.updateEquipment(equipment.id, { active: !equipment.active }),
    onSuccess: (saved) => {
      toast.success(t(saved.active ? 'equipment.reactivated' : 'equipment.deactivated', { name: saved.name }));
      void queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  return (
    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {equipment.active ? t('equipment.deactivate') : t('equipment.reactivate')}
    </Button>
  );
};

const HardwareEquipment: React.FC = () => {
  const { t } = useTranslation(['rentals', 'common']);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Equipment | 'new' | null>(null);
  const filters = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['equipment', 'mine', filters],
    queryFn: () => rentalsApi.myEquipment(filters),
    placeholderData: keepPreviousData,
  });

  const addButton = (
    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setEditing('new')}>
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
      {t('equipment.add')}
    </Button>
  );

  return (
    <AppShell>
      <PageHeader title={t('equipment.title')} subtitle={t('equipment.subtitle')} actions={addButton} />
      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={Tractor} title={t('equipment.empty')} body={t('equipment.emptyBody')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((eq) => {
              const src = fileUrl(eq.image_path);
              return (
                <Card key={eq.id} className={`overflow-hidden ${eq.active ? '' : 'opacity-75'}`}>
                  {src ? (
                    <img src={src} alt={eq.name} className="h-36 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-green-50 dark:bg-gray-800" aria-hidden="true">
                      <Tractor className="h-10 w-10 text-green-600" />
                    </div>
                  )}
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t(`types.${eq.type}`)}</p>
                      <Badge variant={eq.active ? 'default' : 'secondary'} className={eq.active ? 'bg-green-600' : undefined}>
                        {eq.active ? t('equipment.active') : t('equipment.inactive')}
                      </Badge>
                    </div>
                    <h3 className="font-semibold break-words">{eq.name}</h3>
                    {eq.district && (
                      <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {eq.district}
                      </p>
                    )}
                    <RateLine equipment={eq} />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(eq)}>
                        {t('common:actions.edit')}
                      </Button>
                      <ActiveToggle equipment={eq} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
      {editing && (
        <EquipmentDialog
          key={editing === 'new' ? 'new' : editing.id}
          equipment={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
};

export default HardwareEquipment;
