"use client";

interface CurrencySelectorProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

export default function CurrencySelector({
  currency,
  onCurrencyChange,
}: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Currency:
      </label>
      <select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      >
        <option value="USD">USD</option>
        <option value="CAD">CAD</option>
      </select>
    </div>
  );
}
