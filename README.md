# PortfoVision

A portfolio analysis tool I built to track and compare stock performance. It's a full-stack app with a Next.js frontend and FastAPI backend that lets you create custom portfolios, see how they perform over time, and compare them against major market indices.

## What It Does

I wanted something that would let me quickly analyze different portfolio combinations and see how they stack up. So I built this tool that:

- Lets you build custom portfolios with any stocks you want and assign weights
- Shows performance over 1, 5, or 10 year periods
- Compares your portfolio against S&P 500, NASDAQ, and Dow Jones
- Displays everything with interactive charts that update in real-time
- Supports stocks from NYSE, NASDAQ, and TSX (Canadian stocks)
- Handles currency conversion between USD and CAD on the fly
- Shows key metrics like returns, volatility, and drawdowns
- Has AI-powered recommendations (optional - works without it too)

## Getting Started

### Prerequisites

You'll need Node.js and Python installed. If you don't have them yet, grab Node.js from [nodejs.org](https://nodejs.org) and Python from [python.org](https://www.python.org).

### Backend Setup

First, let's get the API running:

```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Once that's done, start the server:

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or if you want to use the run script:

```bash
chmod +x run.sh
./run.sh
```

The API will be running at `http://localhost:8000`. You can check out the interactive API docs at `http://localhost:8000/docs` - it's pretty handy for testing endpoints.

### Frontend Setup

Open a new terminal and from the project root:

```bash
npm install
npm run dev
```

That's it! Open `http://localhost:3000` in your browser. The main portfolio page is at `/portfolio`.

### Environment Variables (Optional)

If you want to customize things, you can set up environment variables. First, copy the example files:

```bash
cp api/.env.example api/.env
cp .env.example .env.local
```

For the backend, you can add an OpenAI API key if you want AI recommendations (it works fine without it - just uses rule-based analysis instead). You can also configure which domains are allowed to access the API.

For the frontend, you only need to set the API URL if your backend isn't running on `localhost:8000`.

Check out [SECURITY.md](SECURITY.md) for more details on keeping things secure.

## How to Use It

It's pretty straightforward:

1. Go to the `/portfolio` page
2. Enter your stock tickers (comma-separated, like `AAPL, MSFT, GOOGL`)
3. Enter the weights for each stock (also comma-separated, like `0.4, 0.4, 0.2`)
4. Pick your time period (1 year, 5 years, or 10 years)
5. Choose your currency (USD or CAD)
6. Hit "Calculate Portfolio" and see the results

The app will show you charts comparing your portfolio to the major indices, plus metrics like cumulative return, volatility, and maximum drawdown. There's also a section that shows what your portfolio would be worth if you'd invested 5 years ago.

## API Endpoints

The backend exposes a few endpoints if you want to integrate this into something else:

- `POST /api/portfolio` - Calculate portfolio performance. Send it tickers, weights, and a period, and it returns performance metrics and a time series.
- `GET /api/data` - Get historical data for a specific stock or index
- `GET /api/data/batch` - Get historical data for multiple tickers at once
- `POST /ai/recommend` - Get stock recommendations (AI-powered if you have an API key, otherwise rule-based)

There's more detailed API documentation in `api/API_DOCUMENTATION.md` if you need it.

## Deployment

Want to put this online? I've written up deployment instructions in [DEPLOYMENT.md](DEPLOYMENT.md).

The short version: I'd deploy the frontend to Vercel (they're great for Next.js apps) and the backend to Railway or Render. Both have free tiers that should be plenty to get started. The deployment guide has step-by-step instructions if you need them.

## Tech Stack

**Frontend:**

- Next.js 14 (React framework)
- TypeScript
- TailwindCSS for styling
- Recharts for data visualization

**Backend:**

- FastAPI (Python web framework)
- yfinance for stock data
- pandas and numpy for data processing

All stock data comes from Yahoo Finance via the yfinance library.

## A Few Notes

- TSX stocks can be entered with or without the `.TO` suffix - the app handles both
- Portfolio weights get normalized automatically if they don't add up to 100%
- Currency conversion uses live exchange rates
- The AI recommendations are completely optional - the app works great without them

## Security

Please don't commit `.env` files! The `.gitignore` is set up to exclude them, but double-check before pushing. See [SECURITY.md](SECURITY.md) for security best practices and more info.

## License

MIT - feel free to use this however you want.
