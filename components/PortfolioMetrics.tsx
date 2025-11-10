"use client";

interface PortfolioMetricsProps {
  performance: {
    return: number;
    volatility: number;
    drawdown: number;
  };
}

export default function PortfolioMetrics({
  performance,
}: PortfolioMetricsProps) {
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getReturnColor = (value: number) => {
    if (value >= 0) return "text-green-600 dark:text-green-400";
    return "text-red-600 dark:text-red-400";
  };

  const getDrawdownColor = (value: number) => {
    // Drawdown is typically negative, so we check if it's less than -10%
    if (value < -10) return "text-red-600 dark:text-red-400";
    if (value < -5) return "text-orange-600 dark:text-orange-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Cumulative Return Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Cumulative Return
          </h3>
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <p
          className={`text-3xl font-bold ${getReturnColor(performance.return)}`}
        >
          {formatPercent(performance.return)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Total return over the selected period
        </p>
      </div>

      {/* Volatility Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Volatility
          </h3>
          <svg
            className="w-5 h-5 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatPercent(performance.volatility)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Annualized volatility (252 trading days)
        </p>
      </div>

      {/* Maximum Drawdown Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Maximum Drawdown
          </h3>
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            />
          </svg>
        </div>
        <p
          className={`text-3xl font-bold ${getDrawdownColor(
            performance.drawdown
          )}`}
        >
          {formatPercent(performance.drawdown)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Largest peak-to-trough decline
        </p>
      </div>
    </div>
  );
}
