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

interface PortfolioChartProps {
  portfolioData: PortfolioData;
  indexData: {
    SP500: IndexData[];
    NASDAQ: IndexData[];
    DOW: IndexData[];
  } | null;
}

export default function PortfolioChart({
  portfolioData,
  indexData,
}: PortfolioChartProps) {
  const chartData = useMemo(() => {
    // Create a map of dates to combine all data
    const dateMap = new Map<string, any>();

    // Add portfolio data first (this is our primary data source)
    portfolioData.timeseries.forEach((point) => {
      dateMap.set(point.date, {
        date: point.date,
        portfolio: point.value,
      });
    });

    // Add index data - only add if date exists in portfolio data
    // This ensures we're comparing on the same dates
    if (indexData) {
      indexData.SP500?.forEach((point) => {
        const existing = dateMap.get(point.date);
        if (existing) {
          existing.SP500 = point.value;
        }
      });

      indexData.NASDAQ?.forEach((point) => {
        const existing = dateMap.get(point.date);
        if (existing) {
          existing.NASDAQ = point.value;
        }
      });

      indexData.DOW?.forEach((point) => {
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
        year: point.date.includes("-") ? "numeric" : undefined,
      }),
    }));
  }, [portfolioData, indexData]);

  const formatValue = (value: number) => {
    return `${((value - 1) * 100).toFixed(2)}%`;
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
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
            formatter={(value: number) => formatValue(value)}
            labelStyle={{ color: "#374151", fontWeight: "bold" }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Portfolio"
          />
          {indexData?.SP500 && indexData.SP500.length > 0 && (
            <Line
              type="monotone"
              dataKey="SP500"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="S&P 500"
            />
          )}
          {indexData?.NASDAQ && indexData.NASDAQ.length > 0 && (
            <Line
              type="monotone"
              dataKey="NASDAQ"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="NASDAQ"
            />
          )}
          {indexData?.DOW && indexData.DOW.length > 0 && (
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
  );
}
