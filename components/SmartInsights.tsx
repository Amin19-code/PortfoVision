"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface StockRecommendation {
  ticker: string;
  recommendation: string;
  confidence?: string;
  key_points: string[];
}

interface SmartInsightsProps {
  tickers: string[];
}

export default function SmartInsights({ tickers }: SmartInsightsProps) {
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>(
    []
  );
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (tickers.length > 0 && tickers.every((t) => t.trim().length > 0)) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
      setSummary(null);
      setError("");
    }
  }, [tickers.join(",")]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/recommend`, {
        tickers: tickers,
      });

      setRecommendations(response.data.recommendations || []);
      setSummary(response.data.summary || null);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to fetch AI recommendations"
      );
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (ticker: string) => {
    setExpanded((prev) => ({
      ...prev,
      [ticker]: !prev[ticker],
    }));
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence?.toLowerCase()) {
      case "high":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "low":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  if (
    !tickers ||
    tickers.length === 0 ||
    !tickers.some((t) => t && t.trim().length > 0)
  ) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Smart Insights
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered analysis of your portfolio stocks
            </p>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300">
            <svg
              className="animate-spin h-5 w-5"
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
            <span className="text-sm font-medium">Analyzing...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg text-red-800 dark:text-red-200 mb-4">
          {error}
          {error.includes("OpenAI") && (
            <p className="text-sm mt-2">
              Note: AI recommendations require an OPENAI_API_KEY environment
              variable. Falling back to rule-based analysis.
            </p>
          )}
        </div>
      )}

      {summary && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Portfolio Summary
          </h3>
          <p className="text-gray-700 dark:text-gray-300">{summary}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.ticker}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {rec.ticker}
                    </h3>
                    {rec.confidence && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(
                          rec.confidence
                        )}`}
                      >
                        {rec.confidence} Confidence
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {rec.recommendation}
                  </p>

                  {rec.key_points.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleExpanded(rec.ticker)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {expanded[rec.ticker] ? "Hide" : "Show"} Key Metrics
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            expanded[rec.ticker] ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {expanded[rec.ticker] && (
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {rec.key_points.map((point, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                            >
                              {point}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No recommendations available. Make sure the tickers are valid and try
          again.
        </div>
      )}
    </div>
  );
}
