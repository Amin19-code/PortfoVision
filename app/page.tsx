'use client'

import { useState } from 'react'
import PortfolioManager from '@/components/PortfolioManager'
import PerformanceComparison from '@/components/PerformanceComparison'
import CurrencySelector from '@/components/CurrencySelector'

export interface StockHolding {
  ticker: string
  weight: number
}

export interface Portfolio {
  holdings: StockHolding[]
  currency: string
}

export default function Home() {
  const [portfolio, setPortfolio] = useState<Portfolio>({
    holdings: [],
    currency: 'USD'
  })
  const [timeframe, setTimeframe] = useState<1 | 5>(1)

  const handlePortfolioUpdate = (holdings: StockHolding[]) => {
    setPortfolio(prev => ({ ...prev, holdings }))
  }

  const handleCurrencyChange = (currency: string) => {
    setPortfolio(prev => ({ ...prev, currency }))
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            PortfoVision
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Analyze and compare your stock portfolio performance
          </p>
        </header>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe(1)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeframe === 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              1 Year
            </button>
            <button
              onClick={() => setTimeframe(5)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeframe === 5
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              5 Years
            </button>
          </div>
          <CurrencySelector
            currency={portfolio.currency}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Manager
            </h2>
            <PortfolioManager
              portfolio={portfolio}
              onPortfolioUpdate={handlePortfolioUpdate}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Performance Analysis
            </h2>
            <PerformanceComparison
              portfolio={portfolio}
              timeframe={timeframe}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

