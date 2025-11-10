"use client";

import { useState } from "react";
import { StockHolding, Portfolio } from "../app/page";

interface PortfolioManagerProps {
  portfolio: Portfolio;
  onPortfolioUpdate: (holdings: StockHolding[]) => void;
}

export default function PortfolioManager({
  portfolio,
  onPortfolioUpdate,
}: PortfolioManagerProps) {
  const [ticker, setTicker] = useState("");
  const [weight, setWeight] = useState("");
  const [exchange, setExchange] = useState("NYSE");
  const [error, setError] = useState("");

  const addHolding = () => {
    setError("");

    if (!ticker.trim()) {
      setError("Please enter a ticker symbol");
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 100) {
      setError("Weight must be between 0 and 100");
      return;
    }

    // Normalize ticker based on exchange
    let normalizedTicker = ticker.toUpperCase().trim();
    if (exchange === "TSX" && !normalizedTicker.endsWith(".TO")) {
      normalizedTicker = `${normalizedTicker}.TO`;
    }

    const newHolding: StockHolding = {
      ticker: normalizedTicker,
      weight: weightNum,
    };

    const updatedHoldings = [...portfolio.holdings, newHolding];

    // Normalize weights to sum to 100
    const totalWeight = updatedHoldings.reduce((sum, h) => sum + h.weight, 0);
    if (totalWeight > 100) {
      setError("Total weight exceeds 100%. Weights will be normalized.");
      const normalized = updatedHoldings.map((h) => ({
        ...h,
        weight: (h.weight / totalWeight) * 100,
      }));
      onPortfolioUpdate(normalized);
    } else {
      onPortfolioUpdate(updatedHoldings);
    }

    setTicker("");
    setWeight("");
  };

  const removeHolding = (index: number) => {
    const updatedHoldings = portfolio.holdings.filter((_, i) => i !== index);
    onPortfolioUpdate(updatedHoldings);
  };

  const updateWeight = (index: number, newWeight: string) => {
    const weightNum = parseFloat(newWeight);
    if (isNaN(weightNum) || weightNum < 0) return;

    const updatedHoldings = portfolio.holdings.map((h, i) => {
      if (i === index) {
        return { ...h, weight: weightNum };
      }
      return h;
    });

    // Normalize if total exceeds 100
    const totalWeight = updatedHoldings.reduce((sum, h) => sum + h.weight, 0);
    if (totalWeight > 100) {
      const normalized = updatedHoldings.map((h) => ({
        ...h,
        weight: (h.weight / totalWeight) * 100,
      }));
      onPortfolioUpdate(normalized);
    } else {
      onPortfolioUpdate(updatedHoldings);
    }
  };

  const totalWeight = portfolio.holdings.reduce((sum, h) => sum + h.weight, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="NYSE">NYSE</option>
          <option value="NASDAQ">NASDAQ</option>
          <option value="TSX">TSX</option>
        </select>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker (e.g., AAPL)"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          onKeyPress={(e) => e.key === "Enter" && addHolding()}
        />
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Weight %"
          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          min="0"
          max="100"
          step="0.1"
          onKeyPress={(e) => e.key === "Enter" && addHolding()}
        />
        <button
          onClick={addHolding}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>

      {error && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Holdings</span>
          <span
            className={
              totalWeight > 100
                ? "text-red-600"
                : "text-gray-600 dark:text-gray-400"
            }
          >
            Total: {totalWeight.toFixed(2)}%
          </span>
        </div>
        {portfolio.holdings.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
            No holdings yet. Add stocks to get started.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {portfolio.holdings.map((holding, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="flex-1 font-medium text-gray-900 dark:text-white">
                  {holding.ticker}
                </span>
                <input
                  type="number"
                  value={holding.weight.toFixed(2)}
                  onChange={(e) => updateWeight(index, e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  min="0"
                  step="0.1"
                />
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  %
                </span>
                <button
                  onClick={() => removeHolding(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
