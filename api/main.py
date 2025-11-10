from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Tuple, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
import httpx
from enum import Enum
import os
from openai import OpenAI

app = FastAPI(title="PortfoVision API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client (optional - will work without API key but won't generate insights)
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Data models
class StockHolding(BaseModel):
    ticker: str
    weight: float

class Portfolio(BaseModel):
    holdings: List[StockHolding]
    currency: str = "USD"

class PerformanceMetrics(BaseModel):
    total_return: float
    annualized_return: float
    volatility: float
    max_drawdown: float
    sharpe_ratio: float

class Period(str, Enum):
    ONE_YEAR = "1y"
    FIVE_YEARS = "5y"
    TEN_YEARS = "10y"

class HistoricalDataPoint(BaseModel):
    date: str
    adjusted_close: float
    daily_return: float
    cumulative_performance: float

class HistoricalDataResponse(BaseModel):
    ticker: str
    period: str
    data: List[HistoricalDataPoint]
    metadata: dict

class PortfolioRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    period: Literal["1y", "5y", "10y"] = "1y"
    currency: Literal["USD", "CAD"] = "USD"
    
    @field_validator('tickers')
    @classmethod
    def validate_tickers(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one ticker is required")
        if len(v) > 50:
            raise ValueError("Maximum 50 tickers allowed")
        return v
    
    @field_validator('weights')
    @classmethod
    def validate_weights(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one weight is required")
        if any(w < 0 for w in v):
            raise ValueError("Weights cannot be negative")
        return v
    
    @model_validator(mode='after')
    def validate_tickers_and_weights_match(self):
        """Validate that number of tickers matches number of weights and weights sum to 1.0"""
        if len(self.tickers) != len(self.weights):
            raise ValueError(f"Number of tickers ({len(self.tickers)}) must match number of weights ({len(self.weights)})")
        weights_sum = sum(self.weights)
        if abs(weights_sum - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, but got {weights_sum:.4f}")
        if self.period not in ["1y", "5y", "10y"]:
            raise ValueError(f"Period must be '1y', '5y', or '10y', but got {self.period}")
        return self

class PortfolioPerformance(BaseModel):
    return_: float = Field(0.0, alias="return", description="Cumulative return in %")
    volatility: float = Field(0.0, description="Annualized volatility in %")
    drawdown: float = Field(0.0, description="Maximum drawdown in %")
    
    class Config:
        populate_by_name = True  # Allow both field name and alias

class PortfolioTimeSeriesPoint(BaseModel):
    date: str
    value: float

class PortfolioResponse(BaseModel):
    performance: PortfolioPerformance
    timeseries: List[PortfolioTimeSeriesPoint]
    currency: Optional[str] = None

class StockRecommendationRequest(BaseModel):
    tickers: List[str]

class StockRecommendation(BaseModel):
    ticker: str
    recommendation: str
    confidence: Optional[str] = None
    key_points: List[str] = []

class StockRecommendationResponse(BaseModel):
    recommendations: List[StockRecommendation]
    summary: Optional[str] = None

# Index mappings
INDICES = {
    "SP500": "^GSPC",
    "NASDAQ": "^IXIC",
    "DOW": "^DJI",
    "GSPC": "^GSPC",
    "IXIC": "^IXIC",
    "DJI": "^DJI"
}

def get_period_days(period: str) -> int:
    """Convert period string to number of days"""
    period_map = {
        "1y": 365,
        "5y": 365 * 5,
        "10y": 365 * 10
    }
    return period_map.get(period, 365)

def normalize_ticker_for_data(ticker: str) -> str:
    """
    Normalize ticker symbol for data fetching, handling indices and TSX stocks.
    
    Supports:
    - Indices: SP500, NASDAQ, DOW, ^GSPC, ^IXIC, ^DJI
    - TSX stocks: Can be specified with .TO suffix (e.g., RY.TO) or without (e.g., RY)
    - NYSE/NASDAQ stocks: Standard tickers (e.g., AAPL, MSFT)
    """
    ticker = ticker.upper().strip()
    
    # Check if it's an index (starts with ^)
    if ticker.startswith("^"):
        return ticker
    
    # Check if it's an index name (without ^)
    if ticker in INDICES:
        return INDICES[ticker]
    
    # Handle TSX stocks - keep .TO suffix if present
    # Note: For TSX stocks without suffix, yfinance may need the .TO suffix
    # Users should specify .TO for TSX stocks, or we attempt without it first
    if ".TO" in ticker:
        return ticker
    
    return ticker

async def fetch_historical_data(ticker: str, period: str) -> Tuple[pd.DataFrame, str]:
    """
    Fetch historical data for a ticker.
    For TSX stocks without .TO suffix, automatically tries adding .TO if initial fetch fails.
    
    Returns:
    - Tuple of (DataFrame with historical data, actual ticker used)
    """
    normalized_ticker = normalize_ticker_for_data(ticker)
    actual_ticker = normalized_ticker
    
    try:
        stock = yf.Ticker(normalized_ticker)
        
        # Use period parameter for yfinance
        hist = stock.history(period=period)
        
        if hist.empty:
            # Try with start/end dates if period doesn't work
            days = get_period_days(period)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days + 30)
            hist = stock.history(start=start_date, end=end_date)
        
        # If still empty and it's not an index and doesn't have .TO, try with .TO suffix (TSX stocks)
        if hist.empty and not normalized_ticker.startswith("^") and ".TO" not in normalized_ticker:
            try:
                tsx_ticker = f"{normalized_ticker}.TO"
                stock_tsx = yf.Ticker(tsx_ticker)
                hist = stock_tsx.history(period=period)
                if hist.empty:
                    days = get_period_days(period)
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=days + 30)
                    hist = stock_tsx.history(start=start_date, end=end_date)
                
                if not hist.empty:
                    actual_ticker = tsx_ticker  # Update to the TSX ticker that worked
            except Exception:
                pass  # If TSX attempt fails, continue with original error
        
        if hist.empty:
            raise ValueError(f"No data available for ticker {ticker}")
        
        return hist, actual_ticker
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Error fetching data for {ticker}: {str(e)}")

def calculate_historical_metrics(hist: pd.DataFrame) -> List[HistoricalDataPoint]:
    """Calculate daily returns and cumulative performance from historical data"""
    if hist.empty:
        return []
    
    # Use Adjusted Close if available, otherwise use Close
    if 'Adj Close' in hist.columns:
        prices = hist['Adj Close']
    else:
        prices = hist['Close']
    
    # Calculate daily returns as percentage
    daily_returns = prices.pct_change() * 100
    
    # Calculate cumulative performance as percentage
    # Starting from first non-null value
    first_price = prices.iloc[0]
    cumulative_performance = ((prices / first_price) - 1) * 100
    
    # Prepare data points
    data_points = []
    for date, row in hist.iterrows():
        idx = hist.index.get_loc(date)
        data_points.append(HistoricalDataPoint(
            date=date.strftime("%Y-%m-%d"),
            adjusted_close=float(prices.iloc[idx]),
            daily_return=float(daily_returns.iloc[idx]) if not pd.isna(daily_returns.iloc[idx]) else 0.0,
            cumulative_performance=float(cumulative_performance.iloc[idx])
        ))
    
    return data_points

async def get_fx_rate(from_currency: str, to_currency: str, date: Optional[datetime] = None) -> float:
    """
    Get FX rate using exchangerate.host API.
    Supports historical rates if date is provided, otherwise returns current rate.
    """
    if from_currency == to_currency:
        return 1.0
    
    try:
        # Use exchangerate.host API for live rates (free, no API key required)
        base_url = "https://api.exchangerate.host"
        
        if date:
            # Historical rate
            date_str = date.strftime("%Y-%m-%d")
            url = f"{base_url}/{date_str}?base={from_currency}&symbols={to_currency}"
        else:
            # Current rate
            url = f"{base_url}/latest?base={from_currency}&symbols={to_currency}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                # exchangerate.host API structure: { "success": true, "rates": { "CAD": 1.35 } }
                if data.get("success") and "rates" in data:
                    rate = data["rates"].get(to_currency)
                    if rate:
                        return float(rate)
                # Fallback: try direct access to rates
                elif "rates" in data:
                    rate = data["rates"].get(to_currency)
                    if rate:
                        return float(rate)
    except Exception as e:
        print(f"Error fetching FX rate from exchangerate.host: {e}")
        # Fallback to yfinance
        try:
            if from_currency == "USD" and to_currency == "CAD":
                ticker = "USDCAD=X"
                fx_ticker = yf.Ticker(ticker)
                fx_data = fx_ticker.history(period="1d")
                if not fx_data.empty:
                    rate = fx_data['Close'].iloc[-1]
                    return float(rate)
            elif from_currency == "CAD" and to_currency == "USD":
                ticker = "USDCAD=X"
                fx_ticker = yf.Ticker(ticker)
                fx_data = fx_ticker.history(period="1d")
                if not fx_data.empty:
                    rate = fx_data['Close'].iloc[-1]
                    return 1.0 / float(rate)
        except Exception as e2:
            print(f"Error fetching FX rate from yfinance: {e2}")
    
    # Final fallback rate (approximate current rates)
    if from_currency == "USD" and to_currency == "CAD":
        return 1.35
    elif from_currency == "CAD" and to_currency == "USD":
        return 0.74
    return 1.0

def normalize_ticker(ticker: str, exchange: str = "NYSE") -> str:
    """Normalize ticker symbol based on exchange"""
    ticker = ticker.upper().strip()
    
    # TSX stocks
    if exchange == "TSX" or ".TO" in ticker:
        if not ticker.endswith(".TO"):
            return f"{ticker}.TO"
        return ticker
    
    # Remove exchange suffixes if present
    ticker = ticker.replace(".TO", "")
    
    return ticker

def calculate_metrics(returns: pd.Series) -> PerformanceMetrics:
    """Calculate performance metrics from returns"""
    if returns.empty:
        return PerformanceMetrics(
            total_return=0.0,
            annualized_return=0.0,
            volatility=0.0,
            max_drawdown=0.0,
            sharpe_ratio=0.0
        )
    
    # Cumulative returns
    cumulative = (1 + returns).cumprod()
    
    # Total return
    total_return = cumulative.iloc[-1] - 1
    
    # Annualized return
    days = len(returns)
    years = days / 252  # Trading days per year
    annualized_return = (cumulative.iloc[-1] ** (1/years)) - 1 if years > 0 else 0
    
    # Volatility (annualized)
    volatility = returns.std() * np.sqrt(252)
    
    # Maximum drawdown
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    max_drawdown = drawdown.min()
    
    # Sharpe ratio (assuming risk-free rate of 0)
    sharpe_ratio = (annualized_return / volatility) if volatility > 0 else 0
    
    return PerformanceMetrics(
        total_return=float(total_return),
        annualized_return=float(annualized_return),
        volatility=float(volatility),
        max_drawdown=float(max_drawdown),
        sharpe_ratio=float(sharpe_ratio)
    )

@app.get("/")
async def root():
    return {"message": "PortfoVision API"}

@app.post("/api/portfolio/calculate")
async def calculate_portfolio(portfolio: Portfolio, years: int = 1):
    """Calculate portfolio performance"""
    try:
        if not portfolio.holdings:
            return {"error": "Portfolio is empty"}
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365 + 30)
        
        # Get FX rate for currency conversion
        fx_rate = await get_fx_rate("USD", portfolio.currency)
        
        # Normalize weights to sum to 100
        total_weight = sum(h.weight for h in portfolio.holdings)
        if total_weight == 0:
            return {"error": "Total portfolio weight cannot be zero"}
        
        normalized_weights = {normalize_ticker(h.ticker): (h.weight / total_weight) * 100 for h in portfolio.holdings}
        
        # Fetch data for all holdings
        portfolio_data = {}
        stock_currencies = {}
        
        for holding in portfolio.holdings:
            ticker = normalize_ticker(holding.ticker)
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(start=start_date, end=end_date)
                
                if not hist.empty:
                    # Get stock currency
                    info = stock.info
                    stock_currency = info.get("currency", "USD")
                    stock_currencies[ticker] = stock_currency
                    
                    # Convert to portfolio currency if needed
                    if stock_currency != portfolio.currency:
                        if stock_currency == "USD" and portfolio.currency == "CAD":
                            # USD to CAD
                            conversion_rate = await get_fx_rate("USD", "CAD")
                            hist['Close'] = hist['Close'] * conversion_rate
                        elif stock_currency == "CAD" and portfolio.currency == "USD":
                            # CAD to USD
                            conversion_rate = await get_fx_rate("CAD", "USD")
                            hist['Close'] = hist['Close'] * conversion_rate
                    
                    portfolio_data[ticker] = hist['Close']
            except Exception as e:
                print(f"Error fetching {ticker}: {e}")
                continue
        
        if not portfolio_data:
            return {"error": "No valid stock data found"}
        
        # Combine into portfolio DataFrame, aligning dates
        df = pd.DataFrame(portfolio_data)
        # Forward fill then backward fill to handle missing dates
        df = df.ffill().bfill()
        
        if df.empty:
            return {"error": "No overlapping trading dates found"}
        
        # Normalize each stock to start at 1.0 (base 100)
        df_normalized = df / df.iloc[0]
        
        # Calculate weighted portfolio (weights are in percentages, so divide by 100)
        portfolio_values = pd.Series(0.0, index=df_normalized.index)
        
        for ticker, price_series in df_normalized.items():
            if ticker in normalized_weights:
                weight = normalized_weights[ticker] / 100.0  # Convert percentage to decimal
                portfolio_values += price_series * weight
        
        # Calculate returns
        returns = portfolio_values.pct_change().dropna()
        
        # Calculate metrics
        metrics = calculate_metrics(returns)
        
        # Prepare chart data
        chart_data = []
        for date, value in portfolio_values.items():
            chart_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "value": float(value),
                "portfolio": float(value)
            })
        
        # Get individual stock returns
        individual_returns = {}
        for ticker, price_series in df_normalized.items():
            if ticker in normalized_weights:
                stock_returns = price_series.pct_change().dropna()
                stock_metrics = calculate_metrics(stock_returns)
                individual_returns[ticker] = {
                    "total_return": stock_metrics.total_return,
                    "annualized_return": stock_metrics.annualized_return,
                    "volatility": stock_metrics.volatility,
                    "max_drawdown": stock_metrics.max_drawdown,
                    "weight": normalized_weights[ticker]
                }
        
        return {
            "metrics": metrics.dict(),
            "chart_data": chart_data,
            "individual_returns": individual_returns,
            "currency": portfolio.currency
        }
    
    except Exception as e:
        import traceback
        print(f"Error in calculate_portfolio: {e}")
        print(traceback.format_exc())
        return {"error": str(e)}

@app.get("/api/indices/{index_name}")
async def get_index_data(index_name: str, years: int = 1, currency: Optional[str] = Query(None, description="Target currency: USD or CAD")):
    """Get index data for comparison"""
    try:
        if index_name.upper() not in INDICES:
            return {"error": "Invalid index name"}
        
        ticker = INDICES[index_name.upper()]
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365 + 30)
        
        index_ticker = yf.Ticker(ticker)
        hist = index_ticker.history(start=start_date, end=end_date)
        
        if hist.empty:
            return {"error": "No data available"}
        
        # Indices are typically in USD, convert if CAD is requested
        target_currency = currency or "USD"
        if target_currency == "CAD":
            # Convert index values to CAD
            first_date = hist.index[0] if isinstance(hist.index, pd.DatetimeIndex) else None
            fx_rate = await get_fx_rate("USD", "CAD", first_date)
            hist['Close'] = hist['Close'] * fx_rate
            if 'Adj Close' in hist.columns:
                hist['Adj Close'] = hist['Adj Close'] * fx_rate
        
        # Normalize to start at 1.0
        normalized = hist['Close'] / hist['Close'].iloc[0]
        
        # Calculate metrics
        returns = normalized.pct_change().dropna()
        metrics = calculate_metrics(returns)
        
        # Prepare chart data
        chart_data = []
        for date, value in normalized.items():
            chart_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "value": float(value)
            })
        
        return {
            "metrics": metrics.dict(),
            "chart_data": chart_data,
            "name": index_name.upper(),
            "currency": target_currency
        }
    
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stock/{ticker}")
async def get_stock_info(ticker: str):
    """Get stock information"""
    try:
        normalized_ticker = normalize_ticker(ticker)
        stock = yf.Ticker(normalized_ticker)
        info = stock.info
        
        return {
            "ticker": normalized_ticker,
            "name": info.get("longName", ticker),
            "exchange": info.get("exchange", "Unknown"),
            "currency": info.get("currency", "USD")
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/fx-rate")
async def get_fx_rate_api(from_currency: str = "USD", to_currency: str = "CAD"):
    """Get FX rate"""
    rate = await get_fx_rate(from_currency, to_currency)
    return {"from": from_currency, "to": to_currency, "rate": rate}

@app.get("/api/data", response_model=HistoricalDataResponse)
async def get_historical_data(
    ticker: str = Query(..., description="Stock ticker symbol (e.g., AAPL, MSFT, RY.TO) or index (SP500, NASDAQ, DOW, ^GSPC, ^IXIC, ^DJI)"),
    period: Period = Query(Period.ONE_YEAR, description="Time period: 1y, 5y, or 10y"),
    currency: Optional[str] = Query(None, description="Target currency: USD or CAD (default: stock's native currency)")
):
    """
    Fetch historical stock or index data with daily prices, returns, and cumulative performance.
    
    Supports:
    - NYSE and NASDAQ stocks (e.g., AAPL, MSFT, GOOGL)
    - TSX stocks: Specify with .TO suffix (e.g., RY.TO, SHOP.TO) or without (e.g., RY, SHOP)
      - The API will automatically try .TO suffix if initial fetch fails
    - Major indices: S&P 500 (SP500, ^GSPC), NASDAQ (NASDAQ, ^IXIC), Dow Jones (DOW, ^DJI)
    
    Parameters:
    - ticker: Stock ticker symbol or index identifier
    - period: Time period - 1y (1 year), 5y (5 years), or 10y (10 years)
    
    Returns:
    - Date: Trading date (YYYY-MM-DD format)
    - Adjusted Close: Adjusted closing price
    - Daily Return: Daily return percentage
    - Cumulative Performance: Cumulative performance percentage from start date
    - Metadata: Additional information including total return, volatility, etc.
    """
    try:
        # Validate period
        period_str = period.value if isinstance(period, Period) else period
        if period_str not in ["1y", "5y", "10y"]:
            raise HTTPException(status_code=400, detail="Period must be 1y, 5y, or 10y")
        
        # Fetch historical data
        hist, actual_ticker = await fetch_historical_data(ticker, period_str)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data available for ticker {ticker}")
        
        # Get stock info to determine native currency
        stock = yf.Ticker(actual_ticker)
        info = stock.info
        stock_currency = info.get("currency", "USD")
        target_currency = currency or stock_currency
        
        # Convert to target currency if specified and different from stock currency
        if target_currency and target_currency != stock_currency and target_currency in ["USD", "CAD"]:
            if 'Adj Close' in hist.columns:
                prices_to_convert = hist['Adj Close'].copy()
            else:
                prices_to_convert = hist['Close'].copy()
            
            # Get FX rate for conversion (use first date's rate for consistency)
            first_date = prices_to_convert.index[0] if isinstance(prices_to_convert.index, pd.DatetimeIndex) else None
            if stock_currency == "USD" and target_currency == "CAD":
                fx_rate = await get_fx_rate("USD", "CAD", first_date)
                if 'Adj Close' in hist.columns:
                    hist['Adj Close'] = hist['Adj Close'] * fx_rate
                hist['Close'] = hist['Close'] * fx_rate
            elif stock_currency == "CAD" and target_currency == "USD":
                fx_rate = await get_fx_rate("CAD", "USD", first_date)
                if 'Adj Close' in hist.columns:
                    hist['Adj Close'] = hist['Adj Close'] * fx_rate
                hist['Close'] = hist['Close'] * fx_rate
        
        # Calculate metrics
        data_points = calculate_historical_metrics(hist)
        
        if not data_points:
            raise HTTPException(status_code=404, detail=f"Unable to process data for ticker {ticker}")
        
        # Calculate summary statistics
        if 'Adj Close' in hist.columns:
            prices = hist['Adj Close']
        else:
            prices = hist['Close']
        
        daily_returns = prices.pct_change().dropna() * 100
        total_return = ((prices.iloc[-1] / prices.iloc[0]) - 1) * 100
        
        metadata = {
            "ticker": actual_ticker,
            "name": info.get("longName", info.get("shortName", ticker)),
            "exchange": info.get("exchange", "Unknown"),
            "currency": target_currency or stock_currency,
            "native_currency": stock_currency,
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "start_date": data_points[0].date,
            "end_date": data_points[-1].date,
            "total_return_pct": round(total_return, 2),
            "avg_daily_return_pct": round(daily_returns.mean(), 4),
            "volatility_pct": round(daily_returns.std(), 4),
            "data_points": len(data_points)
        }
        
        return HistoricalDataResponse(
            ticker=actual_ticker,
            period=period_str,
            data=data_points,
            metadata=metadata
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/data/batch")
async def get_historical_data_batch(
    tickers: str = Query(..., description="Comma-separated list of tickers (e.g., AAPL,MSFT,RY.TO)"),
    period: Period = Query(Period.ONE_YEAR, description="Time period: 1y, 5y, or 10y")
):
    """
    Fetch historical data for multiple tickers at once.
    
    Returns a dictionary with ticker as key and historical data as value.
    """
    try:
        ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
        
        if not ticker_list:
            raise HTTPException(status_code=400, detail="At least one ticker must be provided")
        
        if len(ticker_list) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 tickers allowed per request")
        
        period_str = period.value if isinstance(period, Period) else period
        results = {}
        errors = {}
        
        for ticker in ticker_list:
            try:
                hist, actual_ticker = await fetch_historical_data(ticker, period_str)
                data_points = calculate_historical_metrics(hist)
                
                results[actual_ticker] = {
                    "ticker": actual_ticker,
                    "period": period_str,
                    "data": [dp.dict() for dp in data_points],
                    "data_points": len(data_points)
                }
            except Exception as e:
                errors[ticker] = str(e)
        
        return {
            "results": results,
            "errors": errors,
            "success_count": len(results),
            "error_count": len(errors)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/portfolio", response_model=PortfolioResponse)
async def calculate_portfolio_performance(request: PortfolioRequest):
    """
    Calculate portfolio performance from a list of tickers and weights.
    
    Accepts:
    - tickers: List of stock symbols
    - weights: List of decimal weights (must sum to 1.0)
    - period: '1y', '5y', or '10y'
    - currency: 'USD' or 'CAD' (default: 'USD')
    
    Returns:
    - performance: Cumulative return (%), annualized volatility (%), maximum drawdown (%)
    - timeseries: Time series of portfolio value over time (normalized to start at 1.0)
    """
    try:
        # Validation is handled by Pydantic validators
        # Normalize weights to ensure they sum to exactly 1.0 (handles floating point precision)
        weights_sum = sum(request.weights)
        normalized_weights = [w / weights_sum for w in request.weights]
        
        # Get current FX rate for currency conversion
        target_currency = request.currency
        
        # Fetch historical data for all tickers
        portfolio_data = {}
        ticker_to_actual_ticker = {}  # Map original ticker to actual ticker used
        ticker_currencies = {}  # Track each ticker's native currency
        failed_tickers = []
        
        for i, ticker in enumerate(request.tickers):
            try:
                hist, actual_ticker = await fetch_historical_data(ticker, request.period)
                if not hist.empty:
                    # Get stock info to determine native currency
                    stock = yf.Ticker(actual_ticker)
                    info = stock.info
                    stock_currency = info.get("currency", "USD")
                    ticker_currencies[actual_ticker] = stock_currency
                    
                    # Use Adjusted Close if available, otherwise use Close
                    if 'Adj Close' in hist.columns:
                        prices = hist['Adj Close'].copy()
                    else:
                        prices = hist['Close'].copy()
                    
                    # Convert prices to target currency if needed
                    if stock_currency != target_currency:
                        # Convert using historical FX rates for accuracy
                        # Since prices are normalized later, we can use a single conversion rate
                        # Using the rate from the first trading date for consistency
                        first_date = prices.index[0] if isinstance(prices.index, pd.DatetimeIndex) else None
                        if stock_currency == "USD" and target_currency == "CAD":
                            fx_rate = await get_fx_rate("USD", "CAD", first_date)
                            prices = prices * fx_rate
                        elif stock_currency == "CAD" and target_currency == "USD":
                            fx_rate = await get_fx_rate("CAD", "USD", first_date)
                            prices = prices * fx_rate
                    
                    portfolio_data[actual_ticker] = prices
                    ticker_to_actual_ticker[ticker] = actual_ticker
                else:
                    failed_tickers.append(ticker)
            except Exception as e:
                failed_tickers.append(f"{ticker}: {str(e)}")
        
        if not portfolio_data:
            raise HTTPException(
                status_code=404,
                detail=f"No data available for any ticker. Failed tickers: {', '.join(failed_tickers)}"
            )
        
        # Filter out failed tickers and adjust weights
        successful_tickers = [t for t in request.tickers if t in ticker_to_actual_ticker]
        successful_weights = [normalized_weights[i] for i, t in enumerate(request.tickers) if t in ticker_to_actual_ticker]
        
        if not successful_tickers:
            raise HTTPException(
                status_code=404,
                detail=f"Unable to fetch data for any ticker. Failed: {', '.join(failed_tickers)}"
            )
        
        # Recalculate weights for successful tickers (normalize to sum to 1.0)
        successful_weights_sum = sum(successful_weights)
        if successful_weights_sum > 0:
            successful_weights = [w / successful_weights_sum for w in successful_weights]
        
        # Combine into portfolio DataFrame, aligning dates
        df = pd.DataFrame(portfolio_data)
        
        # Forward fill and backward fill to handle missing dates
        df = df.ffill().bfill()
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No overlapping trading dates found")
        
        # Normalize each stock to start at value = 1.0
        df_normalized = df / df.iloc[0]
        
        # Create weight mapping: map actual ticker (dataframe column) to weight
        weight_map = {}
        for ticker, weight in zip(successful_tickers, successful_weights):
            actual_ticker = ticker_to_actual_ticker[ticker]
            if actual_ticker in df_normalized.columns:
                weight_map[actual_ticker] = weight
        
        # Verify all weights are assigned
        total_assigned_weight = sum(weight_map.values())
        if abs(total_assigned_weight - 1.0) > 0.01:
            # If weights don't match, redistribute equally (shouldn't happen, but safety check)
            if weight_map:
                equal_weight = 1.0 / len(weight_map)
                weight_map = {ticker: equal_weight for ticker in weight_map.keys()}
            else:
                # Fallback: equal weights for all available stocks
                equal_weight = 1.0 / len(df_normalized.columns)
                weight_map = {ticker: equal_weight for ticker in df_normalized.columns}
        
        # Calculate weighted portfolio value over time
        portfolio_values = pd.Series(0.0, index=df_normalized.index)
        
        for ticker, price_series in df_normalized.items():
            weight = weight_map.get(ticker, 0.0)
            portfolio_values += price_series * weight
        
        # Calculate daily returns
        returns = portfolio_values.pct_change().dropna()
        
        # Calculate cumulative return (%)
        cumulative_return = ((portfolio_values.iloc[-1] / portfolio_values.iloc[0]) - 1) * 100
        
        # Calculate annualized volatility (%)
        # Using 252 trading days per year
        annualized_volatility = returns.std() * np.sqrt(252) * 100
        
        # Calculate maximum drawdown (%)
        running_max = portfolio_values.cummax()
        drawdown = (portfolio_values - running_max) / running_max
        max_drawdown = drawdown.min() * 100
        
        # Prepare time series
        timeseries = [
            PortfolioTimeSeriesPoint(
                date=date.strftime("%Y-%m-%d"),
                value=float(value)
            )
            for date, value in portfolio_values.items()
        ]
        
        # Create response
        performance = PortfolioPerformance(
            return_=round(cumulative_return, 2),
            volatility=round(annualized_volatility, 2),
            drawdown=round(max_drawdown, 2)
        )
        
        response = PortfolioResponse(
            performance=performance,
            timeseries=timeseries
        )
        
        # Add currency info to response (using Pydantic's model_dump and adding custom field)
        response_dict = response.model_dump()
        response_dict["currency"] = target_currency
        
        return response_dict
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error in calculate_portfolio_performance: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def analyze_stock_fundamentals(ticker: str) -> dict:
    """Fetch and analyze stock fundamentals and historical performance"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Get historical data
        hist_5y = stock.history(period="5y")
        hist_1y = stock.history(period="1y")
        
        # Calculate key metrics
        metrics = {
            "ticker": ticker,
            "company_name": info.get("longName", info.get("shortName", ticker)),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "market_cap": info.get("marketCap", 0),
            "current_price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
            "pe_ratio": info.get("trailingPE", info.get("forwardPE", None)),
            "pb_ratio": info.get("priceToBook", None),
            "dividend_yield": info.get("dividendYield") or 0,
            "52_week_high": info.get("fiftyTwoWeekHigh", 0),
            "52_week_low": info.get("fiftyTwoWeekLow", 0),
            "beta": info.get("beta", 1.0),
            "debt_to_equity": info.get("debtToEquity", None),
            "profit_margins": info.get("profitMargins", None),
            "revenue_growth": info.get("revenueGrowth", None),
            "earnings_growth": info.get("earningsGrowth", None),
        }
        
        # Calculate performance metrics
        if not hist_5y.empty:
            prices_5y = hist_5y['Close'] if 'Close' in hist_5y.columns else hist_5y.iloc[:, 0]
            returns_5y = prices_5y.pct_change().dropna()
            metrics["5y_total_return"] = ((prices_5y.iloc[-1] / prices_5y.iloc[0]) - 1) * 100
            metrics["5y_volatility"] = returns_5y.std() * np.sqrt(252) * 100
            metrics["5y_max_drawdown"] = ((prices_5y / prices_5y.cummax()) - 1).min() * 100
        
        if not hist_1y.empty:
            prices_1y = hist_1y['Close'] if 'Close' in hist_1y.columns else hist_1y.iloc[:, 0]
            returns_1y = prices_1y.pct_change().dropna()
            metrics["1y_total_return"] = ((prices_1y.iloc[-1] / prices_1y.iloc[0]) - 1) * 100
            metrics["1y_volatility"] = returns_1y.std() * np.sqrt(252) * 100
        
        # Price position relative to 52-week range
        if metrics["52_week_high"] > 0 and metrics["52_week_low"] > 0:
            metrics["price_position"] = (
                (metrics["current_price"] - metrics["52_week_low"]) / 
                (metrics["52_week_high"] - metrics["52_week_low"])
            ) * 100
        
        return metrics
    except Exception as e:
        print(f"Error analyzing {ticker}: {e}")
        return {"ticker": ticker, "error": str(e)}

async def generate_ai_recommendation(ticker: str, metrics: dict) -> str:
    """Use OpenAI to generate stock recommendation"""
    if not openai_client:
        # Fallback to rule-based recommendations if OpenAI is not available
        return generate_rule_based_recommendation(ticker, metrics)
    
    try:
        # Prepare analysis data with safe formatting
        pe_ratio = metrics.get('pe_ratio')
        pb_ratio = metrics.get('pb_ratio')
        debt_to_equity = metrics.get('debt_to_equity')
        profit_margins = metrics.get('profit_margins')
        revenue_growth = metrics.get('revenue_growth')
        earnings_growth = metrics.get('earnings_growth')
        
        # Format values safely
        pe_str = f"{pe_ratio:.2f}" if pe_ratio else 'N/A'
        pb_str = f"{pb_ratio:.2f}" if pb_ratio else 'N/A'
        debt_str = f"{debt_to_equity:.2f}" if debt_to_equity else 'N/A'
        profit_str = f"{(profit_margins * 100):.2f}%" if profit_margins else 'N/A'
        revenue_str = f"{(revenue_growth * 100):.2f}%" if revenue_growth else 'N/A'
        earnings_str = f"{(earnings_growth * 100):.2f}%" if earnings_growth else 'N/A'
        
        analysis_prompt = f"""
Analyze the following stock data and provide a plain-English investment recommendation.

Stock: {metrics.get('company_name', ticker)} ({ticker})
Sector: {metrics.get('sector', 'Unknown')}
Industry: {metrics.get('industry', 'Unknown')}

Current Metrics:
- Current Price: ${metrics.get('current_price') or 0:.2f}
- P/E Ratio: {pe_str}
- P/B Ratio: {pb_str}
- Market Cap: ${metrics.get('market_cap') or 0:,.0f}
- Dividend Yield: {(metrics.get('dividend_yield') or 0)*100:.2f}%
- Beta: {metrics.get('beta') or 1.0:.2f}

Performance:
- 5-Year Total Return: {metrics.get('5y_total_return') or 0:.2f}%
- 5-Year Volatility: {metrics.get('5y_volatility') or 0:.2f}%
- 1-Year Total Return: {metrics.get('1y_total_return') or 0:.2f}%
- Maximum Drawdown (5Y): {metrics.get('5y_max_drawdown') or 0:.2f}%

Financial Health:
- Debt to Equity: {debt_str}
- Profit Margins: {profit_str}
- Revenue Growth: {revenue_str}
- Earnings Growth: {earnings_str}

Price Position:
- 52-Week High: ${metrics.get('52_week_high') or 0:.2f}
- 52-Week Low: ${metrics.get('52_week_low') or 0:.2f}
- Current Price Position: {metrics.get('price_position') or 0:.1f}% of 52-week range

Please provide:
1. A concise investment recommendation (2-3 sentences)
2. Key insights about valuation, performance trends, and financial health
3. Whether the stock appears overvalued, undervalued, or fairly valued
4. Any notable patterns or risks

Be specific and reference the actual numbers in your analysis.
"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a financial analyst providing clear, concise investment recommendations. Always base your analysis on the provided data and highlight specific metrics."},
                {"role": "user", "content": analysis_prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating AI recommendation for {ticker}: {e}")
        return generate_rule_based_recommendation(ticker, metrics)

def generate_rule_based_recommendation(ticker: str, metrics: dict) -> str:
    """Generate rule-based recommendation when OpenAI is not available"""
    if "error" in metrics:
        return f"Unable to analyze {ticker}: {metrics.get('error', 'Unknown error')}"
    
    recommendations = []
    
    # Valuation analysis
    pe_ratio = metrics.get("pe_ratio")
    if pe_ratio:
        if pe_ratio > 30:
            recommendations.append(f"High P/E ratio ({pe_ratio:.2f}) suggests the stock may be overvalued relative to earnings.")
        elif pe_ratio < 15:
            recommendations.append(f"Low P/E ratio ({pe_ratio:.2f}) indicates the stock may be undervalued.")
        else:
            recommendations.append(f"P/E ratio ({pe_ratio:.2f}) appears reasonable relative to the market.")
    
    # Performance analysis
    return_5y = metrics.get("5y_total_return", 0)
    return_1y = metrics.get("1y_total_return", 0)
    
    if return_5y > 100:
        recommendations.append(f"Strong 5-year performance with {return_5y:.1f}% total return.")
    elif return_5y < 0:
        recommendations.append(f"Negative 5-year return ({return_5y:.1f}%) indicates underperformance.")
    
    if return_1y > return_5y / 5:
        recommendations.append(f"Recent 1-year performance ({return_1y:.1f}%) exceeds 5-year average, showing positive momentum.")
    elif return_1y < 0 and return_5y > 0:
        recommendations.append(f"Recent 1-year decline ({return_1y:.1f}%) contrasts with positive 5-year trend, potential buying opportunity.")
    
    # Price position
    price_pos = metrics.get("price_position", 50)
    if price_pos > 80:
        recommendations.append(f"Stock is trading near 52-week high ({price_pos:.1f}% of range), may be overbought.")
    elif price_pos < 20:
        recommendations.append(f"Stock is trading near 52-week low ({price_pos:.1f}% of range), potential value opportunity.")
    
    # Volatility
    volatility = metrics.get("5y_volatility", 0)
    if volatility > 30:
        recommendations.append(f"High volatility ({volatility:.1f}%) indicates significant price swings, suitable for risk-tolerant investors.")
    elif volatility < 15:
        recommendations.append(f"Low volatility ({volatility:.1f}%) suggests relatively stable price movements.")
    
    # Financial health
    debt_to_equity = metrics.get("debt_to_equity")
    if debt_to_equity and debt_to_equity > 1.0:
        recommendations.append(f"High debt-to-equity ratio ({debt_to_equity:.2f}) may indicate financial risk.")
    elif debt_to_equity and debt_to_equity < 0.5:
        recommendations.append(f"Low debt-to-equity ratio ({debt_to_equity:.2f}) suggests strong financial health.")
    
    if not recommendations:
        return f"{ticker} analysis: Mixed signals. Consider reviewing detailed financial statements and recent news."
    
    return f"{ticker} Analysis: " + " ".join(recommendations)

@app.post("/ai/recommend", response_model=StockRecommendationResponse)
async def get_stock_recommendations(request: StockRecommendationRequest):
    """
    Get AI-powered stock recommendations based on historical performance and fundamentals.
    
    Analyzes each ticker's:
    - Historical performance (1-year and 5-year returns, volatility, drawdowns)
    - Valuation metrics (P/E, P/B ratios)
    - Financial health (debt-to-equity, profit margins, growth rates)
    - Price position relative to 52-week range
    
    Returns plain-English recommendations for each stock.
    """
    try:
        if not request.tickers or len(request.tickers) == 0:
            raise HTTPException(status_code=400, detail="At least one ticker is required")
        
        if len(request.tickers) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 tickers allowed per request")
        
        recommendations = []
        
        for ticker in request.tickers:
            try:
                # Normalize ticker
                normalized_ticker = normalize_ticker_for_data(ticker)
                
                # Analyze fundamentals
                metrics = analyze_stock_fundamentals(normalized_ticker)
                
                if "error" in metrics:
                    recommendations.append(StockRecommendation(
                        ticker=normalized_ticker,
                        recommendation=f"Unable to analyze {normalized_ticker}: {metrics.get('error', 'Unknown error')}",
                        key_points=[]
                    ))
                    continue
                
                # Generate recommendation
                recommendation_text = await generate_ai_recommendation(normalized_ticker, metrics)
                
                # Extract key points
                key_points = []
                if metrics.get("pe_ratio"):
                    key_points.append(f"P/E Ratio: {metrics['pe_ratio']:.2f}")
                if metrics.get("5y_total_return") is not None:
                    key_points.append(f"5Y Return: {metrics['5y_total_return']:.2f}%")
                if metrics.get("1y_total_return") is not None:
                    key_points.append(f"1Y Return: {metrics['1y_total_return']:.2f}%")
                if metrics.get("price_position") is not None:
                    key_points.append(f"Price Position: {metrics['price_position']:.1f}% of 52W range")
                
                # Determine confidence level
                confidence = "Medium"
                if metrics.get("pe_ratio") and metrics.get("5y_total_return") is not None:
                    if 15 < metrics["pe_ratio"] < 25 and metrics["5y_total_return"] > 50:
                        confidence = "High"
                    elif metrics["pe_ratio"] > 40 or metrics["5y_total_return"] < -20:
                        confidence = "Low"
                
                recommendations.append(StockRecommendation(
                    ticker=normalized_ticker,
                    recommendation=recommendation_text,
                    confidence=confidence,
                    key_points=key_points
                ))
            except Exception as e:
                recommendations.append(StockRecommendation(
                    ticker=ticker,
                    recommendation=f"Error analyzing {ticker}: {str(e)}",
                    key_points=[]
                ))
        
        # Generate summary if multiple stocks
        summary = None
        if len(recommendations) > 1 and openai_client:
            try:
                summary_prompt = f"""
Summarize the following stock recommendations in 2-3 sentences, highlighting the overall portfolio outlook:

{chr(10).join([f"{r.ticker}: {r.recommendation[:200]}..." for r in recommendations])}
"""
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a financial analyst providing concise portfolio summaries."},
                        {"role": "user", "content": summary_prompt}
                    ],
                    max_tokens=200,
                    temperature=0.7
                )
                summary = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Error generating summary: {e}")
        
        return StockRecommendationResponse(
            recommendations=recommendations,
            summary=summary
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

