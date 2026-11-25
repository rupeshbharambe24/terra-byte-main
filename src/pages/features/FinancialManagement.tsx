import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Link2, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import LedgerCharts from '@/components/farm/LedgerCharts';
import LedgerEntryDialog from '@/components/farm/LedgerEntryDialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { farmApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { categoriesFor, FIELDS_KEY, isLinked, LEDGER_KEY, linkedHref, PERIODS, periodRange, type Period } from '@/lib/farm';
import { formatDate, formatMoney, todayIST } from '@/lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type LedgerEntry, type LedgerType } from '@/lib/types';

const ALL = 'all';

const SummaryCard: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => {
  const { i18n } = useTranslation();
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone}`}>{formatMoney(value, i18n.resolvedLanguage)}</p>
      </CardContent>
    </Card>
  );
};

const FinancialManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['farm', 'common']);
  const lng = i18n.resolvedLanguage;
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [type, setType] = useState<LedgerType | typeof ALL>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [fieldFilter, setFieldFilter] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<{ open: boolean; entry: LedgerEntry | null; key: number }>({
    open: false,
    entry: null,
    key: 0,
  });
  const [deleting, setDeleting] = useState<LedgerEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(
    () => periodRange(period, todayIST(), { from: customFrom, to: customTo }),
    [period, customFrom, customTo]
  );
  const filters = {
    ...range,
    type: type === ALL ? undefined : type,
    category: category === ALL ? undefined : category,
    field_id: fieldFilter === ALL ? undefined : Number(fieldFilter),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const fields = useQuery({ queryKey: FIELDS_KEY, queryFn: farmApi.fields });
  const summary = useQuery({
    queryKey: [...LEDGER_KEY, 'summary', range],
    queryFn: () => farmApi.ledgerSummary(range),
  });
  const entries = useQuery({
    queryKey: [...LEDGER_KEY, 'entries', filters],
    queryFn: () => farmApi.ledger(filters),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => farmApi.deleteEntry(id),
    onSuccess: () => {
      toast.success(t('ledger.deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      await farmApi.exportCsv(range);
    } catch (err) {
      toast.error(errorMessage(t, err));
    } finally {
      setExporting(false);
    }
  };

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };
  const openDialog = (entry: LedgerEntry | null) =>
    setDialog((d) => ({ open: true, entry, key: d.key + 1 }));
  const categoryOptions =
    type === ALL ? [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] : [...categoriesFor(type)];
  const s = summary.data;

  return (
    <AppShell>
      <PageHeader
        title={t('ledger.title')}
        subtitle={t('ledger.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {exporting ? t('ledger.exporting') : t('ledger.export')}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openDialog(null)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('ledger.add')}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1 sm:w-56">
          <Label htmlFor="ledger-period">{t('ledger.period.label')}</Label>
          <Select value={period} onValueChange={(v) => resetPage(setPeriod)(v as Period)}>
            <SelectTrigger id="ledger-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`ledger.period.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ledger-from">{t('ledger.period.from')}</Label>
              <Input id="ledger-from" type="date" value={customFrom} onChange={(e) => resetPage(setCustomFrom)(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ledger-to">{t('ledger.period.to')}</Label>
              <Input id="ledger-to" type="date" value={customTo} onChange={(e) => resetPage(setCustomTo)(e.target.value)} />
            </div>
          </div>
        )}
        {range.from && range.to && period !== 'custom' && (
          <p className="text-sm text-gray-500 sm:pb-2">
            {t('ledger.period.range', { from: formatDate(range.from, lng), to: formatDate(range.to, lng) })}
          </p>
        )}
      </div>

      {summary.isLoading ? (
        <PageSpinner />
      ) : summary.isError ? (
        <ErrorAlert error={summary.error} />
      ) : s && s.entries === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t('ledger.empty')}
          body={t('ledger.emptyBody')}
          action={
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openDialog(null)}>
              {t('ledger.add')}
            </Button>
          }
        />
      ) : s ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label={t('ledger.income')} value={s.income} tone="text-green-700 dark:text-green-400" />
            <SummaryCard label={t('ledger.expense')} value={s.expense} tone="text-orange-700 dark:text-orange-400" />
            <SummaryCard
              label={t('ledger.net')}
              value={s.net}
              tone={s.net < 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}
            />
          </div>
          <p className="text-sm text-gray-500">{t('ledger.entriesCount', { count: s.entries })}</p>
          <LedgerCharts summary={s} />
          {s.by_field.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('ledger.byField')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y dark:divide-gray-700">
                  {s.by_field.map((f) => (
                    <li key={f.field_id ?? 'none'} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {f.field_name ?? t('ledger.unassigned')}
                      </span>
                      <span className="flex flex-wrap gap-x-4">
                        <span className="text-green-700 dark:text-green-400">
                          {t('ledger.income')}: {formatMoney(f.income, lng)}
                        </span>
                        <span className="text-orange-700 dark:text-orange-400">
                          {t('ledger.expense')}: {formatMoney(f.expense, lng)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {s && s.entries > 0 && (
        <section className="mt-6" aria-labelledby="ledger-entries-heading">
          <h2 id="ledger-entries-heading" className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            {t('ledger.entries')}
          </h2>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select
              value={type}
              onValueChange={(v) => {
                resetPage(setType)(v as LedgerType | typeof ALL);
                setCategory(ALL);
              }}
            >
              <SelectTrigger aria-label={t('ledger.filters.type')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ledger.filters.allTypes')}</SelectItem>
                <SelectItem value="expense">{t('ledger.types.expense')}</SelectItem>
                <SelectItem value="income">{t('ledger.types.income')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={resetPage(setCategory)}>
              <SelectTrigger aria-label={t('ledger.filters.category')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ledger.filters.allCategories')}</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`ledger.categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fieldFilter} onValueChange={resetPage(setFieldFilter)}>
              <SelectTrigger aria-label={t('ledger.filters.field')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ledger.filters.allFields')}</SelectItem>
                {(fields.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {entries.isLoading ? (
            <PageSpinner />
          ) : entries.isError ? (
            <ErrorAlert error={entries.error} />
          ) : entries.data && entries.data.items.length === 0 ? (
            <EmptyState title={t('ledger.noMatches')} />
          ) : (
            <Card className={entries.isFetching ? 'opacity-70 transition-opacity' : undefined}>
              <CardContent className="p-0">
                <ul className="divide-y dark:divide-gray-700">
                  {entries.data?.items.map((e) => {
                    const href = linkedHref(e);
                    return (
                      <li key={e.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {t(`ledger.categories.${e.category}`)}
                            </span>
                            <span className="text-sm text-gray-500">{formatDate(e.entry_date, lng)}</span>
                            {e.field_name && <Badge variant="outline">{e.field_name}</Badge>}
                            {href && (
                              <Link to={href}>
                                <Badge variant="secondary" className="gap-1">
                                  <Link2 className="h-3 w-3" aria-hidden="true" />
                                  {e.order_id !== null
                                    ? t('ledger.linkedOrder', { id: e.order_id })
                                    : t('ledger.linkedBooking', { id: e.booking_id })}
                                </Badge>
                              </Link>
                            )}
                          </div>
                          {e.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 break-words">{e.note}</p>}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span
                            className={`font-semibold whitespace-nowrap ${
                              e.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'
                            }`}
                          >
                            {e.type === 'income' ? '+' : '−'}
                            {formatMoney(e.amount_inr, lng)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDialog(e)}
                              aria-label={t('ledger.editEntry')}
                              title={isLinked(e) ? t('ledger.form.linkedHint') : undefined}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleting(e)} aria-label={t('ledger.deleteEntry')}>
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
          <Pager page={page} total={entries.data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </section>
      )}

      <LedgerEntryDialog
        key={dialog.key}
        open={dialog.open}
        entry={dialog.entry}
        fields={fields.data ?? []}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('ledger.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && isLinked(deleting) ? t('ledger.deleteLinkedBody') : t('ledger.deleteBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={remove.isPending}
              onClick={(ev) => {
                ev.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {t('common:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default FinancialManagement;
