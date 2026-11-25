import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { farmApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { categoriesFor, isLinked, LEDGER_KEY, parseOptionalNumber } from '@/lib/farm';
import { todayIST } from '@/lib/format';
import type { FieldPlot, LedgerCategory, LedgerEntry, LedgerInput, LedgerType } from '@/lib/types';

const NO_FIELD = 'none';

interface Props {
  open: boolean;
  entry: LedgerEntry | null;
  fields: FieldPlot[];
  onOpenChange: (open: boolean) => void;
}

/** Add or edit one farm-accounts entry. Linked entries only allow category, field and note. */
const LedgerEntryDialog: React.FC<Props> = ({ open, entry, fields, onOpenChange }) => {
  const { t } = useTranslation(['farm', 'common']);
  const queryClient = useQueryClient();
  const linked = entry !== null && isLinked(entry);
  const [date, setDate] = useState(entry?.entry_date ?? todayIST());
  const [type, setType] = useState<LedgerType>(entry?.type ?? 'expense');
  const [category, setCategory] = useState<LedgerCategory>(entry?.category ?? 'seeds');
  const [amount, setAmount] = useState(entry ? String(entry.amount_inr) : '');
  const [fieldId, setFieldId] = useState(entry?.field_id ? String(entry.field_id) : NO_FIELD);
  const [note, setNote] = useState(entry?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const changeType = (next: LedgerType) => {
    setType(next);
    const allowed = categoriesFor(next);
    if (!allowed.includes(category)) setCategory(allowed[0]);
  };

  const mutation = useMutation({
    mutationFn: (data: Partial<LedgerInput>) =>
      entry ? farmApi.updateEntry(entry.id, data) : farmApi.createEntry(data as LedgerInput),
    onSuccess: () => {
      toast.success(t('ledger.saved'));
      void queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onOpenChange(false);
    },
    onError: (err) => setError(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const common = {
      category,
      field_id: fieldId === NO_FIELD ? null : Number(fieldId),
      note: note.trim() || null,
    };
    if (linked) {
      mutation.mutate(common);
      return;
    }
    const value = parseOptionalNumber(amount);
    if (value === null || Number.isNaN(value) || value <= 0 || value > 10_000_000) {
      return setError(t('ledger.form.amountInvalid'));
    }
    if (!date) return setError(t('ledger.form.dateRequired'));
    mutation.mutate({ ...common, entry_date: date, type, amount_inr: Math.round(value * 100) / 100 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? t('ledger.editTitle') : t('ledger.addTitle')}</DialogTitle>
          <DialogDescription>{linked ? t('ledger.form.linkedHint') : t('ledger.form.hint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ledger-type">{t('ledger.form.type')}</Label>
              <Select value={type} onValueChange={(v) => changeType(v as LedgerType)} disabled={linked}>
                <SelectTrigger id="ledger-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t('ledger.types.expense')}</SelectItem>
                  <SelectItem value="income">{t('ledger.types.income')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger-date">{t('ledger.form.date')}</Label>
              <Input
                id="ledger-date"
                type="date"
                value={date}
                max={todayIST()}
                disabled={linked}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ledger-category">{t('ledger.form.category')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as LedgerCategory)}>
              <SelectTrigger id="ledger-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoriesFor(type).map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`ledger.categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ledger-amount">{t('ledger.form.amount')}</Label>
            <Input
              id="ledger-amount"
              inputMode="decimal"
              value={amount}
              disabled={linked}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ledger-field">{t('ledger.form.field')}</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger id="ledger-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FIELD}>{t('ledger.form.noField')}</SelectItem>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ledger-note">{t('ledger.form.note')}</Label>
            <Textarea
              id="ledger-note"
              value={note}
              maxLength={500}
              placeholder={t('ledger.form.notePlaceholder')}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
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

export default LedgerEntryDialog;
