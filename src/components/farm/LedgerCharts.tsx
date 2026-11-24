import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, formatMonth } from '@/lib/format';
import type { LedgerSummary } from '@/lib/types';

// Same hues in light and dark mode; both pass contrast on white and on gray-800 cards.
export const INCOME_COLOR = '#16a34a';
export const EXPENSE_COLOR = '#ea580c';

const axisTick = { fill: 'currentColor', fontSize: 12 };

function compactMoney(value: number, lng?: string): string {
  return new Intl.NumberFormat(lng === 'en' ? 'en-IN' : `${lng ?? 'en'}-IN`, {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Income vs expense per month, and expense by category, from the server summary. */
const LedgerCharts: React.FC<{ summary: LedgerSummary }> = ({ summary }) => {
  const { t, i18n } = useTranslation(['farm', 'common']);
  const lng = i18n.resolvedLanguage;
  const months = summary.by_month.map((m) => ({ ...m, label: formatMonth(m.month, lng) }));
  const expenses = summary.by_category
    .filter((c) => c.type === 'expense')
    .map((c) => ({ name: t(`ledger.categories.${c.category}`), amount: c.amount }));
  const tooltip = (value: number) => formatMoney(value, lng);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('ledger.chartMonthly')}</CardTitle>
        </CardHeader>
        <CardContent>
          <figure aria-label={t('ledger.chartMonthly')} className="h-64 text-gray-600 dark:text-gray-300">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} />
                <YAxis tick={axisTick} tickLine={false} width={64} tickFormatter={(v: number) => compactMoney(v, lng)} />
                <Tooltip formatter={tooltip} labelStyle={{ color: '#111827' }} cursor={{ fillOpacity: 0.1 }} />
                <Legend />
                <Bar dataKey="income" name={t('ledger.income')} fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name={t('ledger.expense')} fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </figure>
          <table className="sr-only">
            <caption>{t('ledger.chartMonthly')}</caption>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.label}</th>
                  <td>{t('ledger.income')}: {formatMoney(m.income, lng)}</td>
                  <td>{t('ledger.expense')}: {formatMoney(m.expense, lng)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('ledger.chartCategories')}</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t('ledger.noExpenses')}</p>
          ) : (
            <>
              <figure
                aria-label={t('ledger.chartCategories')}
                className="text-gray-600 dark:text-gray-300"
                style={{ height: Math.max(160, expenses.length * 36 + 40) }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenses} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" tick={axisTick} tickLine={false} tickFormatter={(v: number) => compactMoney(v, lng)} />
                    <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} width={110} />
                    <Tooltip formatter={tooltip} labelStyle={{ color: '#111827' }} cursor={{ fillOpacity: 0.1 }} />
                    <Bar dataKey="amount" name={t('ledger.expense')} fill={EXPENSE_COLOR} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </figure>
              <table className="sr-only">
                <caption>{t('ledger.chartCategories')}</caption>
                <tbody>
                  {expenses.map((c) => (
                    <tr key={c.name}>
                      <th scope="row">{c.name}</th>
                      <td>{formatMoney(c.amount, lng)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerCharts;
