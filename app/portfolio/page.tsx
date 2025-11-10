"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PortfolioInputForm from "@/components/PortfolioInputForm";
import PortfolioChart from "@/components/PortfolioChart";
import PortfolioMetrics from "@/components/PortfolioMetrics";
import FiveYearComparison from "@/components/FiveYearComparison";
import SmartInsights from "@/components/SmartInsights";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PortfolioData {
  performance: {
    return: number;
    volatility: number;
    drawdown: number;
  };
  timeseries: Array<{
    date: string;
    value: number;
  }>;
  currency?: string;
}

export interface IndexData {
  date: string;
  value: number;
}

export default function PortfolioPage() {
  const [tickers, setTickers] = useState("");
  const [weights, setWeights] = useState("");
  const [period, setPeriod] = useState<"1y" | "5y" | "10y">("1y");
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(
    null
  );
  const [indexData, setIndexData] = useState<{
    SP500: IndexData[];
    NASDAQ: IndexData[];
    DOW: IndexData[];
  } | null>(null);
  const [portfolioData5y, setPortfolioData5y] = useState<PortfolioData | null>(
    null
  );
  const [indexData5y, setIndexData5y] = useState<{
    SP500: IndexData[];
    NASDAQ: IndexData[];
    DOW: IndexData[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loading5y, setLoading5y] = useState(false);
  const [error, setError] = useState("");
  const lastCalculationRef = useRef<{
    tickers: string;
    weights: string;
    period: string;
    currency: string;
  } | null>(null);
  const isCalculatingRef = useRef(false);

  const handleCalculate = useCallback(async () => {
    // Prevent multiple simultaneous calculations
    if (isCalculatingRef.current) {
      return;
    }

    isCalculatingRef.current = true;
    setError("");
    setLoading(true);

    try {
      // Parse tickers and weights
      const tickerList = tickers
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const weightList = weights
        .split(",")
        .map((w) => parseFloat(w.trim()))
        .filter((w) => !isNaN(w));

      // Validate inputs
      if (tickerList.length === 0) {
        throw new Error("Please enter at least one ticker");
      }

      if (weightList.length === 0) {
        throw new Error("Please enter at least one weight");
      }

      if (tickerList.length !== weightList.length) {
        throw new Error(
          `Number of tickers (${tickerList.length}) must match number of weights (${weightList.length})`
        );
      }

      // Normalize weights to sum to 1.0
      const weightsSum = weightList.reduce((sum, w) => sum + w, 0);
      if (weightsSum <= 0) {
        throw new Error("Weights must sum to a positive number");
      }

      const normalizedWeights = weightList.map((w) => w / weightsSum);

      // Store calculation inputs
      lastCalculationRef.current = {
        tickers: tickers.trim(),
        weights: weights.trim(),
        period: period,
        currency: currency,
      };

      // Call portfolio API for selected period
      const portfolioResponse = await axios.post(
        `${API_BASE_URL}/api/portfolio`,
        {
          tickers: tickerList,
          weights: normalizedWeights,
          period: period,
          currency: currency,
        }
      );

      setPortfolioData(portfolioResponse.data);

      // Fetch index data for comparison (selected period)
      const indexPromises = [
        axios.get(`${API_BASE_URL}/api/data`, {
          params: { ticker: "SP500", period: period, currency: currency },
        }),
        axios.get(`${API_BASE_URL}/api/data`, {
          params: { ticker: "NASDAQ", period: period, currency: currency },
        }),
        axios.get(`${API_BASE_URL}/api/data`, {
          params: { ticker: "DOW", period: period, currency: currency },
        }),
      ];

      const [sp500Res, nasdaqRes, dowRes] = await Promise.allSettled(
        indexPromises
      );

      const indexDataResult: any = {
        SP500: [],
        NASDAQ: [],
        DOW: [],
      };

      if (sp500Res.status === "fulfilled" && sp500Res.value.data.data) {
        indexDataResult.SP500 = sp500Res.value.data.data.map((d: any) => ({
          date: d.date,
          value: d.cumulative_performance / 100 + 1,
        }));
      }

      if (nasdaqRes.status === "fulfilled" && nasdaqRes.value.data.data) {
        indexDataResult.NASDAQ = nasdaqRes.value.data.data.map((d: any) => ({
          date: d.date,
          value: d.cumulative_performance / 100 + 1,
        }));
      }

      if (dowRes.status === "fulfilled" && dowRes.value.data.data) {
        indexDataResult.DOW = dowRes.value.data.data.map((d: any) => ({
          date: d.date,
          value: d.cumulative_performance / 100 + 1,
        }));
      }

      setIndexData(indexDataResult);

      // Always fetch 5-year data for comparison
      setLoading5y(true);
      try {
        // Fetch 5-year portfolio data
        const portfolio5yResponse = await axios.post(
          `${API_BASE_URL}/api/portfolio`,
          {
            tickers: tickerList,
            weights: normalizedWeights,
            period: "5y",
            currency: currency,
          }
        );

        setPortfolioData5y(portfolio5yResponse.data);

        // Fetch 5-year index data
        const index5yPromises = [
          axios.get(`${API_BASE_URL}/api/data`, {
            params: { ticker: "SP500", period: "5y", currency: currency },
          }),
          axios.get(`${API_BASE_URL}/api/data`, {
            params: { ticker: "NASDAQ", period: "5y", currency: currency },
          }),
          axios.get(`${API_BASE_URL}/api/data`, {
            params: { ticker: "DOW", period: "5y", currency: currency },
          }),
        ];

        const [sp500Res5y, nasdaqRes5y, dowRes5y] = await Promise.allSettled(
          index5yPromises
        );

        const indexData5yResult: any = {
          SP500: [],
          NASDAQ: [],
          DOW: [],
        };

        if (sp500Res5y.status === "fulfilled" && sp500Res5y.value.data.data) {
          indexData5yResult.SP500 = sp500Res5y.value.data.data.map(
            (d: any) => ({
              date: d.date,
              value: d.cumulative_performance / 100 + 1,
            })
          );
        }

        if (nasdaqRes5y.status === "fulfilled" && nasdaqRes5y.value.data.data) {
          indexData5yResult.NASDAQ = nasdaqRes5y.value.data.data.map(
            (d: any) => ({
              date: d.date,
              value: d.cumulative_performance / 100 + 1,
            })
          );
        }

        if (dowRes5y.status === "fulfilled" && dowRes5y.value.data.data) {
          indexData5yResult.DOW = dowRes5y.value.data.data.map((d: any) => ({
            date: d.date,
            value: d.cumulative_performance / 100 + 1,
          }));
        }

        setIndexData5y(indexData5yResult);
      } catch (err: any) {
        console.error("Error fetching 5-year comparison data:", err);
        // Don't show error for 5-year data, just log it
      } finally {
        setLoading5y(false);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to calculate portfolio performance"
      );
      setPortfolioData(null);
      setIndexData(null);
      setPortfolioData5y(null);
      setIndexData5y(null);
    } finally {
      setLoading(false);
      setLoading5y(false);
      isCalculatingRef.current = false;
    }
  }, [tickers, weights, period, currency]);

  // Auto-recalculate when currency changes (if we have previous calculation)
  useEffect(() => {
    // Skip if we're already calculating or if we don't have previous calculation data
    if (
      isCalculatingRef.current ||
      !lastCalculationRef.current ||
      !tickers ||
      !weights
    ) {
      return;
    }

    // Only recalculate if currency changed and inputs are the same
    if (
      lastCalculationRef.current.currency !== currency &&
      lastCalculationRef.current.tickers === tickers.trim() &&
      lastCalculationRef.current.weights === weights.trim() &&
      lastCalculationRef.current.period === period
    ) {
      // Currency changed, recalculate
      handleCalculate();
    }
  }, [currency, tickers, weights, period, handleCalculate]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Portfolio Analyzer
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Analyze your portfolio performance and compare with market
                indices
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </header>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <PortfolioInputForm
            tickers={tickers}
            weights={weights}
            period={period}
            currency={currency}
            onTickersChange={setTickers}
            onWeightsChange={setWeights}
            onPeriodChange={setPeriod}
            onCurrencyChange={setCurrency}
            onCalculate={handleCalculate}
            loading={loading}
            error={error}
          />
        </div>

        {/* Chart Section */}
        {portfolioData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Performance
            </h2>
            <PortfolioChart
              portfolioData={portfolioData}
              indexData={indexData}
            />
          </div>
        )}

        {/* Metrics Cards */}
        {portfolioData && (
          <PortfolioMetrics performance={portfolioData.performance} />
        )}

        {/* 5-Year Comparison Section */}
        {portfolioData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5-Year Investment Comparison
            </h2>
            <FiveYearComparison
              portfolioData5y={portfolioData5y}
              indexData5y={indexData5y}
              loading={loading5y}
              currency={currency}
            />
          </div>
        )}

        {/* Smart Insights Section */}
        {portfolioData && tickers && (
          <div className="mt-6">
            <SmartInsights
              tickers={tickers
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
