import React from 'react';

interface BreakdownProps {
  rows: { key: string; label: string; count: number }[];
  /** Shown when every count is zero. */
  emptyText: string;
  ariaLabel: string;
}

/** Counts as labelled horizontal bars (plain HTML, so it reads well on phones and screen readers). */
const Breakdown: React.FC<BreakdownProps> = ({ rows, emptyText, ariaLabel }) => {
  const max = Math.max(0, ...rows.map((r) => r.count));
  if (max === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>;
  return (
    <ul className="space-y-2" aria-label={ariaLabel}>
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate text-gray-700 dark:text-gray-300">{r.label}</span>
          <span className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden="true">
            <span
              className="block h-2.5 rounded-full bg-green-600 dark:bg-green-500"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </span>
          <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">{r.count}</span>
        </li>
      ))}
    </ul>
  );
};

export default Breakdown;
