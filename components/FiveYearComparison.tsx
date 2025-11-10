"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PortfolioData, IndexData } from "../app/portfolio/page";

interface FiveYearComparisonProps {
  portfolioData5y: PortfolioData | null;
  indexData5y: {
    SP500: IndexData[];
    NASDAQ: IndexData[];
    DOW: IndexData[];
  } | null;
  loading?: boolean;
  currency?: "USD" | "CAD";
}

export default function FiveYearComparison({
  portfolioData5y,
  indexData5y,
  loading,
  currency = "USD",
}: FiveYearComparisonProps) {
  const chartData = useMemo(() => {
    if (!portfolioData5y) return [];

    // Create a map of dates to combine all data
    const dateMap = new Map<string, any>();

    // Add portfolio data first (this is our primary data source)
    portfolioData5y.timeseries.forEach((point) => {
      dateMap.set(point.date, {
        date: point.date,
        portfolio: point.value,
      });
    });

    // Add index data - only add if date exists in portfolio data
    if (indexData5y) {
      indexData5y.SP500?.forEach((point) => {
        const existing = dateMap.get(point.date);
        if (existing) {
          existing.SP500 = point.value;
        }
      });

      indexData5y.NASDAQ?.forEach((point) => {
        const existing = dateMap.get(point.date);
        if (existing) {
          existing.NASDAQ = point.value;
        }
      });

      indexData5y.DOW?.forEach((point) => {
        const existing = dateMap.get(point.date);
        if (existing) {
          existing.DOW = point.value;
        }
      });
    }

    // Convert to array and sort by date
    const sortedData = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Format dates for display
    return sortedData.map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));
  }, [portfolioData5y, indexData5y]);

  const formatValue = (value: number) => {
    if (value === undefined || value === null) return "N/A";
    return `${((value - 1) * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null) return "N/A";
    // Assuming $10,000 initial investment
    const initialInvestment = 10000;
    const currentValue = initialInvestment * value;
    const currencySymbol = currency === "CAD" ? "C$" : "$";
    return `${currencySymbol}${currentValue.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">
          Loading 5-year comparison...
        </div>
      </div>
    );
  }

  if (!portfolioData5y) {
    return null;
  }

  // Calculate final values
  const portfolioFinalValue =
    portfolioData5y.timeseries[portfolioData5y.timeseries.length - 1]?.value ||
    1;
  const portfolioReturn = portfolioData5y.performance.return;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              5-Year Investment Scenario
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              If you had invested $10,000 in this portfolio 5 years ago, here's
              what it would be worth today compared to major market indices.
            </p>
          </div>
        </div>
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
            Your Portfolio
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(portfolioFinalValue)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {formatValue(portfolioReturn)} total return
          </div>
        </div>

        {indexData5y?.SP500 &&
          indexData5y.SP500.length > 0 &&
          (() => {
            const sp500Final =
              indexData5y.SP500[indexData5y.SP500.length - 1]?.value || 1;
            const sp500Return = (sp500Final - 1) * 100;
            return (
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                  S&P 500
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(sp500Final)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatValue(sp500Final)} total return
                </div>
              </div>
            );
          })()}

        {indexData5y?.NASDAQ &&
          indexData5y.NASDAQ.length > 0 &&
          (() => {
            const nasdaqFinal =
              indexData5y.NASDAQ[indexData5y.NASDAQ.length - 1]?.value || 1;
            const nasdaqReturn = (nasdaqFinal - 1) * 100;
            return (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg shadow p-4 border-l-4 border-orange-500">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                  NASDAQ
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(nasdaqFinal)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatValue(nasdaqFinal)} total return
                </div>
              </div>
            );
          })()}

        {indexData5y?.DOW &&
          indexData5y.DOW.length > 0 &&
          (() => {
            const dowFinal =
              indexData5y.DOW[indexData5y.DOW.length - 1]?.value || 1;
            const dowReturn = (dowFinal - 1) * 100;
            return (
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                  Dow Jones
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(dowFinal)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatValue(dowFinal)} total return
                </div>
              </div>
            );
          })()}
      </div>

      {/* Chart */}
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(value) => formatValue(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number, name: string) => {
                const displayName =
                  name === "portfolio"
                    ? "Portfolio"
                    : name === "SP500"
                    ? "S&P 500"
                    : name === "NASDAQ"
                    ? "NASDAQ"
                    : "Dow Jones";
                return `${formatValue(value)} (${formatCurrency(value)})`;
              }}
              labelFormatter={(label) => `Date: ${label}`}
              labelStyle={{ color: "#374151", fontWeight: "bold" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              name="Portfolio"
            />
            {indexData5y?.SP500 && indexData5y.SP500.length > 0 && (
              <Line
                type="monotone"
                dataKey="SP500"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="S&P 500"
              />
            )}
            {indexData5y?.NASDAQ && indexData5y.NASDAQ.length > 0 && (
              <Line
                type="monotone"
                dataKey="NASDAQ"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="NASDAQ"
              />
            )}
            {indexData5y?.DOW && indexData5y.DOW.length > 0 && (
              <Line
                type="monotone"
                dataKey="DOW"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Dow Jones"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
