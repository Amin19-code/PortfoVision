"use client";

interface PortfolioInputFormProps {
  tickers: string;
  weights: string;
  period: "1y" | "5y" | "10y";
  currency: "USD" | "CAD";
  onTickersChange: (value: string) => void;
  onWeightsChange: (value: string) => void;
  onPeriodChange: (value: "1y" | "5y" | "10y") => void;
  onCurrencyChange: (value: "USD" | "CAD") => void;
  onCalculate: () => void;
  loading: boolean;
  error: string;
}

export default function PortfolioInputForm({
  tickers,
  weights,
  period,
  currency,
  onTickersChange,
  onWeightsChange,
  onPeriodChange,
  onCurrencyChange,
  onCalculate,
  loading,
  error,
}: PortfolioInputFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tickers Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stock Tickers
          </label>
          <input
            type="text"
            value={tickers}
            onChange={(e) => onTickersChange(e.target.value)}
            placeholder="AAPL, MSFT, NVDA"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter tickers separated by commas (e.g., AAPL, MSFT, NVDA)
          </p>
        </div>

        {/* Weights Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weights
          </label>
          <input
            type="text"
            value={weights}
            onChange={(e) => onWeightsChange(e.target.value)}
            placeholder="0.4, 0.4, 0.2"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter weights separated by commas (should sum to 1.0)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Period Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Period
          </label>
          <select
            value={period}
            onChange={(e) =>
              onPeriodChange(e.target.value as "1y" | "5y" | "10y")
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="1y">1 Year</option>
            <option value="5y">5 Years</option>
            <option value="10y">10 Years</option>
          </select>
        </div>

        {/* Currency Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as "USD" | "CAD")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Calculate Button */}
      <div className="flex justify-end">
        <button
          onClick={onCalculate}
          disabled={loading || !tickers || !weights}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Calculating...
            </>
          ) : (
            "Calculate Portfolio"
          )}
        </button>
      </div>
    </div>
  );
}
