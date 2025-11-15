# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Environment Variables

**⚠️ Never commit `.env` files to version control!**

This project uses environment variables for sensitive configuration. All `.env` files are excluded from version control via `.gitignore`.

### Required Environment Variables

#### Backend (`api/.env`)

1. **`OPENAI_API_KEY`** (Optional)

   - Purpose: Enables AI-powered stock recommendations
   - Required: No (falls back to rule-based analysis if not provided)
   - How to get: https://platform.openai.com/api-keys
   - Example: `OPENAI_API_KEY=sk-...`

2. **`ALLOWED_ORIGINS`** (Optional)
   - Purpose: Configures CORS allowed origins
   - Required: No (defaults to `http://localhost:3000` for development)
   - Format: Comma-separated list of URLs
   - Example: `ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com`

#### Frontend (`.env.local`)

1. **`NEXT_PUBLIC_API_URL`** (Optional)
   - Purpose: API endpoint URL for the frontend
   - Required: No (defaults to `http://localhost:8000` for development)
   - Example: `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Setup Instructions

1. **Copy the example files:**

   ```bash
   cp api/.env.example api/.env
   cp .env.example .env.local
   ```

2. **Fill in your values:**

   - Edit `api/.env` and add your OpenAI API key (if using AI features)
   - Edit `.env.local` if you need to change the API URL
   - **Never commit these files!**

3. **Verify `.gitignore` is working:**
   ```bash
   git status
   # Should NOT show .env or .env.local files
   ```

### Security Checklist Before Publishing

Before making this repository public, verify:

- [ ] No `.env` files are tracked by git
- [ ] No hardcoded API keys or secrets in code
- [ ] No credentials in commit history
- [ ] `.gitignore` properly excludes sensitive files
- [ ] Only `.env.example` files are committed (not actual `.env` files)

### Checking for Sensitive Data

Run these commands to verify no sensitive data is in the repository:

```bash
# Check for .env files (should return nothing)
git ls-files | grep "\.env$"

# Check for hardcoded API keys (should return nothing)
grep -r "sk-[a-zA-Z0-9]" . --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.git

# Check if venv is tracked (should return nothing)
git ls-files | grep venv

# Verify .gitignore includes all sensitive files
cat .gitignore | grep -E "\.env|venv|node_modules"
```

### Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email the maintainer directly (if contact information is available)
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

### Data Sources

This application fetches data from:

- **Yahoo Finance** (via `yfinance` library) - Public stock market data
- **ExchangeRate.host** - Public currency exchange rates
- **OpenAI API** (optional) - For AI-powered recommendations

No user data is stored or transmitted to external services except:

- Stock ticker symbols and weights (sent to Yahoo Finance API)
- Currency conversion requests (sent to ExchangeRate.host)
- Stock analysis requests (sent to OpenAI API if enabled)

### Privacy

- **No user authentication required** - The app works without user accounts
- **No data storage** - All calculations are performed in real-time
- **No tracking** - No analytics or user tracking is implemented
- **Client-side only** - Portfolio data never leaves the user's browser except for API calls to fetch stock data

### Best Practices for Deployment

1. **Use environment variables** for all configuration
2. **Never hardcode** API keys or secrets
3. **Use HTTPS** in production
4. **Configure CORS** properly for your domain
5. **Keep dependencies updated** to patch security vulnerabilities
6. **Use secret management** services for production (e.g., AWS Secrets Manager, Azure Key Vault)

## License

MIT License - See LICENSE file for details
