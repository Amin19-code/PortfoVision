# PortfoVision API Documentation

## Portfolio Performance Endpoint

### POST /api/portfolio

Calculate portfolio performance from a list of tickers and weights.

#### Request Body

```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL"],
  "weights": [0.4, 0.3, 0.3],
  "period": "1y"
}
```

#### Parameters

- **tickers** (required): List of stock symbols

  - Examples: `["AAPL", "MSFT", "GOOGL"]`, `["RY.TO", "SHOP.TO"]`
  - Maximum 50 tickers per request
  - Supports NYSE, NASDAQ, and TSX stocks

- **weights** (required): List of decimal weights

  - Must sum to 1.0 (within 0.01 tolerance for floating point precision)
  - Must be non-negative
  - Must have the same length as tickers list
  - Examples: `[0.4, 0.3, 0.3]`, `[0.5, 0.5]`

- **period** (optional): Time period for analysis
  - Options: `"1y"` (1 year) or `"5y"` (5 years)
  - Default: `"1y"`

#### Response

Returns a JSON object with the following structure:

```json
{
  "performance": {
    "return": 25.67,
    "volatility": 18.45,
    "drawdown": -12.34
  },
  "timeseries": [
    {
      "date": "2023-01-02",
      "value": 1.0
    },
    {
      "date": "2023-01-03",
      "value": 1.0123
    }
    // ... more data points
  ]
}
```

#### Response Fields

- **performance**: Portfolio performance metrics

  - **return**: Cumulative return over the period (percentage)
  - **volatility**: Annualized volatility (percentage, calculated using 252 trading days per year)
  - **drawdown**: Maximum drawdown over the period (percentage, negative value)

- **timeseries**: Time series of portfolio value
  - **date**: Trading date (YYYY-MM-DD format)
  - **value**: Portfolio value normalized to start at 1.0

#### Example Requests

```bash
# Calculate 1-year portfolio performance
curl -X POST "http://localhost:8000/api/portfolio" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "MSFT", "GOOGL"],
    "weights": [0.4, 0.3, 0.3],
    "period": "1y"
  }'

# Calculate 5-year portfolio performance
curl -X POST "http://localhost:8000/api/portfolio" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "MSFT"],
    "weights": [0.6, 0.4],
    "period": "5y"
  }'

# Portfolio with TSX stocks
curl -X POST "http://localhost:8000/api/portfolio" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["RY.TO", "SHOP.TO"],
    "weights": [0.5, 0.5],
    "period": "1y"
  }'
```

#### Error Responses

- **400 Bad Request**:
  - Invalid input (tickers/weights mismatch, weights don't sum to 1.0, negative weights, etc.)
  - Invalid period
  - Too many tickers (>50)
- **404 Not Found**: No data available for any ticker
- **500 Internal Server Error**: Server error while processing

#### Notes

- Each stock is normalized to start at value = 1.0
- Portfolio value is calculated as the weighted sum of normalized stock values
- Adjusted close prices are used (accounts for stock splits and dividends)
- Dates are aligned across all stocks (forward fill and backward fill for missing dates)
- If some tickers fail to fetch, the endpoint will proceed with available tickers and adjust weights accordingly
- Volatility is annualized using 252 trading days per year
- Maximum drawdown is the largest peak-to-trough decline during the period

---

## Historical Data Endpoints

### GET /api/data

Fetch historical stock or index data with daily prices, returns, and cumulative performance.

#### Parameters

- **ticker** (required, query parameter): Stock ticker symbol or index identifier

  - Examples: `AAPL`, `MSFT`, `RY.TO`, `SP500`, `^GSPC`, `NASDAQ`, `^IXIC`, `DOW`, `^DJI`
  - Supports NYSE, NASDAQ, and TSX stocks
  - TSX stocks can be specified with or without `.TO` suffix (e.g., `RY` or `RY.TO`)
  - Indices can be specified by name (e.g., `SP500`) or symbol (e.g., `^GSPC`)

- **period** (optional, query parameter): Time period for historical data
  - Options: `1y` (1 year), `5y` (5 years), `10y` (10 years)
  - Default: `1y`

#### Response

Returns a JSON object with the following structure:

```json
{
  "ticker": "AAPL",
  "period": "5y",
  "data": [
    {
      "date": "2019-01-02",
      "adjusted_close": 38.72,
      "daily_return": 0.0,
      "cumulative_performance": 0.0
    },
    {
      "date": "2019-01-03",
      "adjusted_close": 39.28,
      "daily_return": 1.45,
      "cumulative_performance": 1.45
    }
    // ... more data points
  ],
  "metadata": {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "exchange": "NMS",
    "currency": "USD",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "start_date": "2019-01-02",
    "end_date": "2024-01-02",
    "total_return_pct": 245.67,
    "avg_daily_return_pct": 0.1234,
    "volatility_pct": 1.5678,
    "data_points": 1258
  }
}
```

#### Response Fields

- **ticker**: Normalized ticker symbol used
- **period**: Time period requested
- **data**: Array of historical data points
  - **date**: Trading date (YYYY-MM-DD format)
  - **adjusted_close**: Adjusted closing price
  - **daily_return**: Daily return percentage
  - **cumulative_performance**: Cumulative performance percentage from start date
- **metadata**: Additional information about the ticker
  - **ticker**: Ticker symbol
  - **name**: Company/index name
  - **exchange**: Stock exchange
  - **currency**: Currency of the security
  - **sector**: Business sector (for stocks)
  - **industry**: Industry (for stocks)
  - **start_date**: First date in the dataset
  - **end_date**: Last date in the dataset
  - **total_return_pct**: Total return over the period (percentage)
  - **avg_daily_return_pct**: Average daily return (percentage)
  - **volatility_pct**: Volatility (standard deviation of daily returns, percentage)
  - **data_points**: Number of data points returned

#### Example Requests

```bash
# Get 1 year of data for Apple
GET /api/data?ticker=AAPL&period=1y

# Get 5 years of data for Microsoft
GET /api/data?ticker=MSFT&period=5y

# Get 10 years of data for S&P 500
GET /api/data?ticker=SP500&period=10y

# Get 1 year of data for TSX stock (Royal Bank)
GET /api/data?ticker=RY.TO&period=1y

# Get 5 years of data for NASDAQ index
GET /api/data?ticker=^IXIC&period=5y
```

#### Error Responses

- **400 Bad Request**: Invalid period parameter
- **404 Not Found**: No data available for the ticker
- **500 Internal Server Error**: Server error while fetching data

---

### GET /api/data/batch

Fetch historical data for multiple tickers at once.

#### Parameters

- **tickers** (required, query parameter): Comma-separated list of ticker symbols

  - Maximum 10 tickers per request
  - Examples: `AAPL,MSFT,GOOGL` or `SP500,NASDAQ,DOW`

- **period** (optional, query parameter): Time period for historical data
  - Options: `1y`, `5y`, `10y`
  - Default: `1y`

#### Response

Returns a JSON object with the following structure:

```json
{
  "results": {
    "AAPL": {
      "ticker": "AAPL",
      "period": "1y",
      "data": [
        {
          "date": "2023-01-02",
          "adjusted_close": 130.28,
          "daily_return": 0.0,
          "cumulative_performance": 0.0
        }
        // ... more data points
      ],
      "data_points": 252
    },
    "MSFT": {
      "ticker": "MSFT",
      "period": "1y",
      "data": [
        // ... data points
      ],
      "data_points": 252
    }
  },
  "errors": {
    "INVALID": "No data available for ticker INVALID"
  },
  "success_count": 2,
  "error_count": 1
}
```

#### Response Fields

- **results**: Dictionary with ticker as key and historical data as value
- **errors**: Dictionary of tickers that failed to fetch with error messages
- **success_count**: Number of successfully fetched tickers
- **error_count**: Number of failed tickers

#### Example Requests

```bash
# Get data for multiple stocks
GET /api/data/batch?tickers=AAPL,MSFT,GOOGL&period=1y

# Get data for indices
GET /api/data/batch?tickers=SP500,NASDAQ,DOW&period=5y

# Get data for mixed stocks and indices
GET /api/data/batch?tickers=AAPL,SP500,RY.TO&period=1y
```

#### Error Responses

- **400 Bad Request**: No tickers provided or more than 10 tickers
- **500 Internal Server Error**: Server error while fetching data

---

## Supported Tickers

### Stock Exchanges

- **NYSE**: New York Stock Exchange (e.g., `AAPL`, `MSFT`, `JPM`)
- **NASDAQ**: NASDAQ Stock Market (e.g., `GOOGL`, `AMZN`, `TSLA`)
- **TSX**: Toronto Stock Exchange (e.g., `RY.TO`, `SHOP.TO`, `CNR.TO`)
  - Can be specified with or without `.TO` suffix
  - If no data found without suffix, automatically tries with `.TO`

### Indices

- **S&P 500**: `SP500` or `^GSPC`
- **NASDAQ Composite**: `NASDAQ` or `^IXIC`
- **Dow Jones Industrial Average**: `DOW` or `^DJI`

---

## Notes

- All prices are in the currency of the security (USD for US stocks, CAD for TSX stocks)
- Daily returns are calculated as percentage change from previous day
- Cumulative performance is calculated from the first date in the dataset
- Adjusted close prices account for stock splits and dividends
- Data is fetched from Yahoo Finance via the `yfinance` library
- Historical data availability depends on the ticker and exchange

---

## AI Recommendations Endpoint

### POST /ai/recommend

Get AI-powered stock recommendations based on historical performance and company fundamentals.

#### Request Body

```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL"]
}
```

#### Parameters

- **tickers** (required): List of stock ticker symbols
  - Maximum 10 tickers per request
  - Supports NYSE, NASDAQ, and TSX stocks
  - Examples: `["AAPL", "MSFT", "GOOGL"]`, `["RY.TO", "SHOP.TO"]`

#### Response

Returns a JSON object with the following structure:

```json
{
  "recommendations": [
    {
      "ticker": "AAPL",
      "recommendation": "Apple Inc. appears fairly valued with a P/E ratio of 28.5. The stock has shown strong 5-year performance with 245% total return, though recent 1-year returns are more modest. The company maintains healthy profit margins and low debt levels, indicating strong financial health. However, trading at 85% of its 52-week high suggests limited upside potential in the near term.",
      "confidence": "Medium",
      "key_points": [
        "P/E Ratio: 28.50",
        "5Y Return: 245.67%",
        "1Y Return: 35.23%",
        "Price Position: 85.2% of 52W range"
      ]
    }
  ],
  "summary": "Overall portfolio analysis: The selected stocks show mixed signals with some overvalued positions and others offering potential value opportunities."
}
```

#### Response Fields

- **recommendations**: Array of stock recommendations

  - **ticker**: Stock ticker symbol
  - **recommendation**: Plain-English investment recommendation (2-3 sentences)
  - **confidence**: Confidence level (High, Medium, Low)
  - **key_points**: Array of key metrics (P/E ratio, returns, price position)

- **summary**: Optional portfolio-level summary (only for multiple stocks with OpenAI enabled)

#### Analysis Includes

- **Valuation Metrics**: P/E ratio, P/B ratio, market capitalization
- **Performance Analysis**: 1-year and 5-year returns, volatility, maximum drawdown
- **Financial Health**: Debt-to-equity ratio, profit margins, revenue growth, earnings growth
- **Price Position**: Current price relative to 52-week high/low range
- **Pattern Detection**: Identifies overvalued/undervalued stocks based on trends

#### Example Requests

```bash
# Get recommendations for multiple stocks
curl -X POST "http://localhost:8000/ai/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "MSFT", "GOOGL"]
  }'

# Get recommendation for a single stock
curl -X POST "http://localhost:8000/ai/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL"]
  }'
```

#### Error Responses

- **400 Bad Request**: No tickers provided or too many tickers (>10)
- **500 Internal Server Error**: Server error while analyzing stocks

#### Notes

- **OpenAI Integration**: When `OPENAI_API_KEY` environment variable is set, the endpoint uses GPT-4o-mini to generate intelligent, context-aware recommendations
- **Fallback Mode**: If OpenAI API key is not available, the endpoint uses rule-based analysis that still provides valuable insights
- **Analysis Depth**: The endpoint analyzes historical performance patterns, valuation metrics, and financial fundamentals to detect overvalued or undervalued stocks
- **Recommendations**: All recommendations are in plain English and reference specific metrics from the analysis
- **Confidence Levels**: Based on data quality and consistency of signals (High: clear signals, Medium: mixed signals, Low: unclear or conflicting data)
