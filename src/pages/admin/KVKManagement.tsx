import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import ConfirmButton from '@/components/advice/ConfirmButton';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PINCODE_RE, blankToNull, optionalNumber } from '@/lib/advice';
import { adviceApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS, PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type { KVK, KVKInput } from '@/lib/types';

const ALL = 'all';
const TEXT_FIELDS = [
  'name',
  'district',
  'state',
  'host_organisation',
  'address',
  'pincode',
  'phone',
  'email',
  'website',
  'lat',
  'lon',
  'source_url',
  'verified_on',
] as const;
type FormField = (typeof TEXT_FIELDS)[number];
type FormState = Record<FormField, string>;

function toForm(k: KVK | null): FormState {
  const form = Object.fromEntries(TEXT_FIELDS.map((f) => [f, ''])) as FormState;
  form.state = 'Maharashtra';
  if (!k) return form;
  for (const f of TEXT_FIELDS) {
    const v = k[f];
    form[f] = v === null || v === undefined ? '' : String(v);
  }
  return form;
}

const isUrl = (v: string) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim());

/** Client-side checks mirroring the API (which validates again). Returns field -> message key. */
function validate(f: FormState): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {};
  if (f.name.trim().length < 3) errors.name = 'kvkAdmin.errors.required';
  if (f.district.trim().length < 2) errors.district = 'kvkAdmin.errors.required';
  if (f.state.trim().length < 2) errors.state = 'kvkAdmin.errors.required';
  if (f.pincode.trim() && !PINCODE_RE.test(f.pincode.replace(/\s/g, ''))) errors.pincode = 'kvkAdmin.errors.pincode';
  if (f.email.trim() && !f.email.includes('@')) errors.email = 'kvkAdmin.errors.email';
  if (!isUrl(f.website)) errors.website = 'kvkAdmin.errors.url';
  if (!isUrl(f.source_url)) errors.source_url = 'kvkAdmin.errors.url';
  const lat = optionalNumber(f.lat);
  const lon = optionalNumber(f.lon);
  if (lat !== null && !(lat >= 6 && lat <= 38)) errors.lat = 'kvkAdmin.errors.lat';
  if (lon !== null && !(lon >= 68 && lon <= 98)) errors.lon = 'kvkAdmin.errors.lon';
  return errors;
}

function toPayload(f: FormState): KVKInput {
  return {
    name: f.name.trim(),
    district: f.district.trim(),
    state: f.state.trim(),
    host_organisation: blankToNull(f.host_organisation),
    address: blankToNull(f.address),
    pincode: blankToNull(f.pincode.replace(/\s/g, '')),
    phone: blankToNull(f.phone),
    email: blankToNull(f.email),
    website: blankToNull(f.website),
    lat: optionalNumber(f.lat),
    lon: optionalNumber(f.lon),
    source_url: blankToNull(f.source_url),
    verified_on: blankToNull(f.verified_on),
  };
}

const KVKDialog: React.FC<{ kvk: KVK | null; open: boolean; onOpenChange: (o: boolean) => void }> = ({
  kvk,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation(['advice', 'common']);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(kvk));
  const [touched, setTouched] = useState(false);
  const errors = validate(form);
  const valid = Object.keys(errors).length === 0;

  const save = useMutation({
    mutationFn: () => (kvk ? adviceApi.updateKvk(kvk.id, toPayload(form)) : adviceApi.createKvk(toPayload(form))),
    onSuccess: () => {
      toast.success(t('kvkAdmin.saved'));
      void queryClient.invalidateQueries({ queryKey: ['kvks'] });
      void queryClient.invalidateQueries({ queryKey: ['kvk-status'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const field = (name: FormField, opts: { type?: string; inputMode?: 'decimal' | 'numeric' | 'tel' | 'email' | 'url'; list?: string } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`kvk-${name}`}>{t(`kvkAdmin.fields.${name}`)}</Label>
      <Input
        id={`kvk-${name}`}
        type={opts.type ?? 'text'}
        inputMode={opts.inputMode}
        list={opts.list}
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        aria-invalid={touched && Boolean(errors[name])}
      />
      {touched && errors[name] && <p className="text-xs text-red-600">{t(errors[name] as string)}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{kvk ? t('kvkAdmin.dialogEdit') : t('kvkAdmin.dialogAdd')}</DialogTitle>
          <DialogDescription>{t('kvkAdmin.dialogHint')}</DialogDescription>
        </DialogHeader>
        <form
          id="kvk-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (valid) save.mutate();
          }}
        >
          <div className="sm:col-span-2">{field('name')}</div>
          {field('district', { list: 'mh-districts' })}
          {field('state')}
          <div className="sm:col-span-2">{field('host_organisation')}</div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="kvk-address">{t('kvkAdmin.fields.address')}</Label>
            <Textarea
              id="kvk-address"
              rows={2}
              value={form.address}
              maxLength={1000}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          {field('pincode', { inputMode: 'numeric' })}
          {field('phone', { inputMode: 'tel' })}
          {field('email', { type: 'email' })}
          {field('website', { type: 'url' })}
          {field('lat', { inputMode: 'decimal' })}
          {field('lon', { inputMode: 'decimal' })}
          {field('source_url', { type: 'url' })}
          {field('verified_on', { type: 'date' })}
          <datalist id="mh-districts">
            {MAHARASHTRA_DISTRICTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form="kvk-form" disabled={save.isPending}>
            {save.isPending ? t('common:actions.saving') : t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Admin CRUD on the KVK directory stored in the database. */
const KVKManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['advice', 'common']);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<KVK | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);
  const filters = { q: q || undefined, district: district === ALL ? undefined : district, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const query = useQuery({
    queryKey: ['kvks', 'admin', filters],
    queryFn: () => adviceApi.kvks(filters),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (id: number) => adviceApi.deleteKvk(id),
    onSuccess: () => {
      toast.success(t('kvkAdmin.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['kvks'] });
      void queryClient.invalidateQueries({ queryKey: ['kvk-status'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const openDialog = (k: KVK | null) => {
    setEditing(k);
    setDialogKey((n) => n + 1);
    setDialogOpen(true);
  };
  const filtered = Boolean(filters.q || filters.district);

  return (
    <AppShell>
      <PageHeader
        title={t('kvkAdmin.title')}
        subtitle={t('kvkAdmin.subtitle')}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin-kvk-integration">{t('kvkAdmin.importStatus')}</Link>
            </Button>
            <Button onClick={() => openDialog(null)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('kvkAdmin.add')}
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
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
      {query.isLoading ? (
        <PageSpinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} />
      ) : !query.data || query.data.total === 0 ? (
        <EmptyState
          icon={Building2}
          title={filtered ? t('kvk.noMatch') : t('kvkAdmin.empty')}
          body={filtered ? undefined : t('kvkAdmin.emptyBody')}
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {t('kvk.count', { count: query.data.total })}
          </p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('kvkAdmin.columns.name')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('kvkAdmin.columns.district')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('kvkAdmin.columns.contact')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('kvkAdmin.columns.verified')}</TableHead>
                    <TableHead>{t('kvkAdmin.columns.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.items.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <div className="font-medium break-words">{k.name}</div>
                        {k.host_organisation && <div className="text-sm text-gray-500">{k.host_organisation}</div>}
                        <div className="text-sm text-gray-500 sm:hidden">{k.district}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {k.district}
                        <div className="text-xs text-gray-500">{k.state}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {[k.phone, k.email].filter(Boolean).join(' · ') || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap text-sm">
                        {k.verified_on ? formatDate(k.verified_on, i18n.resolvedLanguage) : t('kvk.notVerified')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDialog(k)}>
                            {t('common:actions.edit')}
                          </Button>
                          <ConfirmButton
                            label={t('common:actions.delete')}
                            title={t('kvkAdmin.deleteTitle', { name: k.name })}
                            body={t('kvkAdmin.deleteBody')}
                            confirmLabel={t('common:actions.delete')}
                            cancelLabel={t('common:actions.cancel')}
                            onConfirm={() => remove.mutate(k.id)}
                            disabled={remove.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Pager page={page} total={query.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
      <KVKDialog key={dialogKey} kvk={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  );
};

export default KVKManagement;
