"use client";

import { useState, useEffect } from "react";
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
import { Portfolio } from "../app/page";
import axios from "axios";

interface PerformanceComparisonProps {
  portfolio: Portfolio;
  timeframe: 1 | 5;
}

interface Metrics {
  total_return: number;
  annualized_return: number;
  volatility: number;
  max_drawdown: number;
  sharpe_ratio: number;
}

interface ChartDataPoint {
  date: string;
  value: number;
  portfolio?: number;
  SP500?: number;
  NASDAQ?: number;
  DOW?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PerformanceComparison({
  portfolio,
  timeframe,
}: PerformanceComparisonProps) {
  const [loading, setLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<ChartDataPoint[]>([]);
  const [portfolioMetrics, setPortfolioMetrics] = useState<Metrics | null>(
    null
  );
  const [indexData, setIndexData] = useState<Record<string, ChartDataPoint[]>>(
    {}
  );
  const [indexMetrics, setIndexMetrics] = useState<Record<string, Metrics>>({});
  const [individualReturns, setIndividualReturns] = useState<
    Record<string, any>
  >({});
  const [error, setError] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<string[]>([
    "SP500",
    "NASDAQ",
    "DOW",
  ]);

  useEffect(() => {
    if (portfolio.holdings.length === 0) {
      setPortfolioData([]);
      setPortfolioMetrics(null);
      setIndexData({});
      setIndexMetrics({});
      setIndividualReturns({});
      return;
    }

    fetchPerformanceData();
  }, [portfolio, timeframe]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch portfolio data
      const portfolioResponse = await axios.post(
        `${API_BASE_URL}/api/portfolio/calculate`,
        {
          holdings: portfolio.holdings,
          currency: portfolio.currency,
        },
        {
          params: { years: timeframe },
        }
      );

      if (portfolioResponse.data.error) {
        setError(portfolioResponse.data.error);
        setLoading(false);
        return;
      }

      const portfolioChartData = portfolioResponse.data.chart_data || [];
      setPortfolioMetrics(portfolioResponse.data.metrics || null);
      setIndividualReturns(portfolioResponse.data.individual_returns || {});

      // Fetch index data
      const indices = ["SP500", "NASDAQ", "DOW"];
      const indexPromises = indices.map(async (index) => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/indices/${index}`,
            { params: { years: timeframe } }
          );
          if (!response.data.error) {
            return { index, data: response.data };
          }
        } catch (err) {
          console.error(`Error fetching ${index}:`, err);
        }
        return null;
      });

      const indexResults = await Promise.all(indexPromises);
      const newIndexData: Record<string, ChartDataPoint[]> = {};
      const newIndexMetrics: Record<string, Metrics> = {};

      indexResults.forEach((result) => {
        if (result) {
          newIndexData[result.index] = result.data.chart_data || [];
          newIndexMetrics[result.index] = result.data.metrics || null;
        }
      });

      setIndexData(newIndexData);
      setIndexMetrics(newIndexMetrics);

      // Combine chart data
      combineChartData(portfolioChartData, newIndexData);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to fetch performance data"
      );
      console.error("Error fetching performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const combineChartData = (
    portfolioData: ChartDataPoint[],
    indexData: Record<string, ChartDataPoint[]>
  ) => {
    if (portfolioData.length === 0) {
      setPortfolioData([]);
      return;
    }

    // Create a map of dates to combine all data
    const dateMap = new Map<string, ChartDataPoint>();

    // Add portfolio data first
    portfolioData.forEach((point) => {
      dateMap.set(point.date, {
        date: point.date,
        value: point.value,
        portfolio: point.value,
      });
    });

    // Add index data - only add if date exists in portfolio data
    Object.entries(indexData).forEach(([index, data]) => {
      data.forEach((point) => {
        const existing = dateMap.get(point.date);
        if (existing) {
          (existing as any)[index] = point.value;
        }
      });
    });

    // Convert to array and sort by date
    const combined = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((point) => ({
        ...point,
        // Ensure all indices are set, even if missing
        SP500: point.SP500 ?? undefined,
        NASDAQ: point.NASDAQ ?? undefined,
        DOW: point.DOW ?? undefined,
      }));

    setPortfolioData(combined);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatNumber = (value: number) => value.toFixed(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">
          Loading performance data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg text-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (portfolio.holdings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Add stocks to your portfolio to see performance analysis
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={portfolioData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getFullYear()}`;
              }}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(value) => `${((value - 1) * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number) => {
                if (value === undefined || value === null) return "N/A";
                return `${((value - 1) * 100).toFixed(2)}%`;
              }}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString();
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Portfolio"
            />
            {selectedIndices.includes("SP500") && indexData.SP500 && (
              <Line
                type="monotone"
                dataKey="SP500"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="S&P 500"
              />
            )}
            {selectedIndices.includes("NASDAQ") && indexData.NASDAQ && (
              <Line
                type="monotone"
                dataKey="NASDAQ"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="NASDAQ"
              />
            )}
            {selectedIndices.includes("DOW") && indexData.DOW && (
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

      {/* Index Selection */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">
          Compare with:
        </span>
        {["SP500", "NASDAQ", "DOW"].map((index) => (
          <label key={index} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIndices.includes(index)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIndices([...selectedIndices, index]);
                } else {
                  setSelectedIndices(
                    selectedIndices.filter((i) => i !== index)
                  );
                }
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {index === "SP500"
                ? "S&P 500"
                : index === "NASDAQ"
                ? "NASDAQ"
                : "Dow Jones"}
            </span>
          </label>
        ))}
      </div>

      {/* Portfolio Metrics */}
      {portfolioMetrics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Return
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercent(portfolioMetrics.total_return)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Annualized Return
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercent(portfolioMetrics.annualized_return)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Volatility
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercent(portfolioMetrics.volatility)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Max Drawdown
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercent(portfolioMetrics.max_drawdown)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Sharpe Ratio
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(portfolioMetrics.sharpe_ratio)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Index Metrics Comparison */}
      {Object.keys(indexMetrics).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Index Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Index
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Total Return
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Annualized
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Volatility
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(indexMetrics).map(([index, metrics]) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                      {index === "SP500"
                        ? "S&P 500"
                        : index === "NASDAQ"
                        ? "NASDAQ"
                        : "Dow Jones"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.total_return)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.annualized_return)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.volatility)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Stock Returns */}
      {Object.keys(individualReturns).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Individual Stock Returns
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Ticker
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Total Return
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Annualized
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Volatility
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Max Drawdown
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(individualReturns).map(([ticker, metrics]) => (
                  <tr key={ticker}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                      {ticker}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.total_return)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.annualized_return)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.volatility)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPercent(metrics.max_drawdown)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
