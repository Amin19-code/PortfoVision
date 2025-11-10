# PortfoVision

A full-stack web application for analyzing and comparing stock portfolio performance built with Next.js and FastAPI.

## Features

- ✅ Create and edit stock portfolios with custom tickers and weights
- ✅ Compare portfolio performance over 1 year and 5 years
- ✅ Compare with S&P 500, NASDAQ, and Dow Jones indices
- ✅ Interactive charts showing portfolio growth using daily prices
- ✅ Support for stocks from TSX, NYSE, and NASDAQ
- ✅ Currency selection (USD/CAD) with live FX conversion
- ✅ Display total and individual returns, volatility, and drawdowns
- ✅ Modern UI with TailwindCSS and Recharts

## Project Structure

```
PortfoVision-1/
├── app/                 # Next.js frontend
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page
├── components/          # React components
│   ├── PortfolioManager.tsx
│   ├── PerformanceComparison.tsx
│   └── CurrencySelector.tsx
├── api/                 # FastAPI backend
│   ├── main.py          # API endpoints
│   ├── requirements.txt # Python dependencies
│   └── run.sh           # Backend startup script
├── package.json         # Node.js dependencies
└── README.md
```

## Setup Instructions

### Backend (FastAPI)

1. Navigate to the API directory:

```bash
cd api
```

2. Create a virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the backend server:

```bash
# Option 1: Using the run script
chmod +x run.sh
./run.sh

# Option 2: Directly with Python
python main.py

# Option 3: Using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend (Next.js)

1. Install dependencies:

```bash
npm install
```

2. (Optional) Create a `.env.local` file to configure the API URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. **Add Stocks**: Select an exchange (NYSE, NASDAQ, or TSX), enter a ticker symbol, and specify the weight percentage.

2. **Select Timeframe**: Choose between 1 year or 5 years for performance analysis.

3. **Select Currency**: Choose USD or CAD to view performance in your preferred currency.

4. **View Performance**: See your portfolio's performance metrics, compare with indices, and view individual stock returns.

5. **Interactive Charts**: Toggle which indices to compare with using the checkboxes.

## API Endpoints

### Portfolio & Performance

- `POST /api/portfolio` - Calculate portfolio performance from tickers and weights
  - Accepts: `tickers` (list), `weights` (list), `period` ('1y' or '5y')
  - Returns: Performance metrics (return, volatility, drawdown) and time series
  - Example: `POST /api/portfolio` with `{"tickers": ["AAPL", "MSFT"], "weights": [0.6, 0.4], "period": "1y"}`
- `POST /api/portfolio/calculate` - Calculate portfolio performance (legacy endpoint)
- `GET /api/indices/{index_name}` - Get index data (SP500, NASDAQ, DOW)
- `GET /api/stock/{ticker}` - Get stock information
- `GET /api/fx-rate` - Get FX conversion rate

### Historical Data

- `GET /api/data` - Fetch historical stock or index data

  - Parameters:
    - `ticker` (required): Stock ticker (e.g., AAPL, MSFT, RY.TO) or index (SP500, NASDAQ, DOW, ^GSPC, ^IXIC, ^DJI)
    - `period` (optional): Time period - `1y`, `5y`, or `10y` (default: `1y`)
  - Returns: Daily historical data with adjusted close prices, daily returns (%), and cumulative performance (%)
  - Example: `GET /api/data?ticker=AAPL&period=5y`

- `GET /api/data/batch` - Fetch historical data for multiple tickers
  - Parameters:
    - `tickers` (required): Comma-separated list of tickers (e.g., AAPL,MSFT,RY.TO)
    - `period` (optional): Time period - `1y`, `5y`, or `10y` (default: `1y`)
  - Returns: Dictionary with ticker as key and historical data as value
  - Example: `GET /api/data/batch?tickers=AAPL,MSFT,SP500&period=1y`

### AI Recommendations

- `POST /ai/recommend` - Get AI-powered stock recommendations
  - Request Body:
    ```json
    {
      "tickers": ["AAPL", "MSFT", "GOOGL"]
    }
    ```
  - Returns: Plain-English recommendations for each stock based on historical performance and fundamentals
  - Example: `POST /ai/recommend` with `{"tickers": ["AAPL", "MSFT"]}`
  - Note: Requires `OPENAI_API_KEY` environment variable for AI-powered insights. Falls back to rule-based analysis if not available.

## Technologies Used

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS, Recharts
- **Backend**: FastAPI, Python, yfinance, pandas, numpy
- **Data Sources**: Yahoo Finance (via yfinance)

## Environment Variables

Create a `.env` file in the `api/` directory for optional configuration:

```bash
# OpenAI API Key (optional - for AI-powered recommendations)
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** The AI recommendation feature works without an OpenAI API key using rule-based analysis. For enhanced AI-powered insights, add your OpenAI API key to the `.env` file.

## Notes

- Stock data is fetched from Yahoo Finance using the `yfinance` library
- TSX stocks should be entered with or without the `.TO` suffix (automatically handled)
- FX rates are fetched live from Yahoo Finance
- Portfolio weights are automatically normalized if they exceed 100%
- AI recommendations use OpenAI GPT-4o-mini model when API key is available, otherwise fall back to rule-based analysis

## License

MIT
