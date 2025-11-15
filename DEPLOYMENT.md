# Deployment Guide

This guide explains how to deploy PortfoVision to make it publicly accessible.

## Quick Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend) - Recommended

**Frontend (Next.js) on Vercel:**

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel will auto-detect Next.js and deploy
5. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`

**Backend (FastAPI) on Railway or Render:**

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) or [render.com](https://render.com)
3. Create a new service from GitHub
4. Select your repository
5. Set build command: `cd api && pip install -r requirements.txt`
6. Set start command: `cd api && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables:
   - `OPENAI_API_KEY` (optional)
   - `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`
8. Get your backend URL and update frontend's `NEXT_PUBLIC_API_URL`

### Option 2: Vercel (Full-Stack)

Vercel supports serverless functions, but FastAPI works best on a dedicated server.

### Option 3: Heroku

**Frontend:**

1. Install Heroku CLI
2. Create `Procfile` in root: `web: npm start`
3. Deploy: `git push heroku main`

**Backend:**

1. Create `Procfile` in `api/`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
2. Deploy: `git push heroku main`

### Option 4: DigitalOcean App Platform

1. Connect GitHub repository
2. Create two apps:
   - Frontend (Next.js)
   - Backend (Python/FastAPI)
3. Configure environment variables
4. Set up custom domains

## Environment Variables for Production

### Frontend (Vercel/Netlify)

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend (Railway/Render/Heroku)

```
OPENAI_API_KEY=your_openai_api_key (optional)
ALLOWED_ORIGINS=https://your-frontend-url.com
PORT=8000 (usually set automatically)
```

## Step-by-Step: Deploy to Vercel + Railway

### 1. Deploy Backend to Railway

1. **Sign up at [railway.app](https://railway.app)**
2. **Create New Project** → **Deploy from GitHub repo**
3. **Select your repository**
4. **Configure service:**
   - Root Directory: `api`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Add environment variables:**
   - `OPENAI_API_KEY` (optional)
   - `ALLOWED_ORIGINS` (will set after frontend is deployed)
6. **Get your Railway URL:** `https://your-app.railway.app`

### 2. Deploy Frontend to Vercel

1. **Sign up at [vercel.com](https://vercel.com)**
2. **Import Git Repository** → Select your GitHub repo
3. **Configure project:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `.` (root)
4. **Add environment variable:**
   - `NEXT_PUBLIC_API_URL` = `https://your-app.railway.app`
5. **Deploy**
6. **Get your Vercel URL:** `https://your-app.vercel.app`

### 3. Update Backend CORS

1. Go back to Railway
2. Update `ALLOWED_ORIGINS` environment variable:
   - `ALLOWED_ORIGINS=https://your-app.vercel.app`
3. Redeploy backend

### 4. Test Your Deployment

- Frontend: `https://your-app.vercel.app`
- Portfolio page: `https://your-app.vercel.app/portfolio`
- Backend API: `https://your-app.railway.app`
- API Docs: `https://your-app.railway.app/docs`

## Custom Domain Setup

### Frontend (Vercel)

1. Go to Vercel project settings
2. Add your domain
3. Follow DNS configuration instructions

### Backend (Railway)

1. Go to Railway project settings
2. Add custom domain
3. Update `ALLOWED_ORIGINS` to include your custom domain

## Free Hosting Options

### Frontend

- **Vercel** - Free tier, excellent for Next.js
- **Netlify** - Free tier, great for static sites
- **GitHub Pages** - Free, but requires static export

### Backend

- **Railway** - Free tier with $5 credit monthly
- **Render** - Free tier with limitations
- **Fly.io** - Free tier available
- **PythonAnywhere** - Free tier for Python apps
- **Heroku** - No longer free, but affordable

## Troubleshooting

### CORS Errors

- Make sure `ALLOWED_ORIGINS` includes your frontend URL
- Check that URLs match exactly (https vs http)

### Backend Not Responding

- Check that the backend is running on the correct port
- Verify environment variables are set
- Check logs for errors

### Frontend Can't Connect to Backend

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that backend URL is accessible
- Verify CORS is configured properly

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] Custom domains set up (optional)
- [ ] HTTPS enabled (usually automatic)
- [ ] API keys secured (not in code)
- [ ] Error handling tested
- [ ] Performance optimized

## Cost Estimate

### Free Tier (Recommended for Start)

- **Vercel**: Free (hobby plan)
- **Railway**: Free ($5 credit/month)
- **Total**: $0/month

### Paid Options

- **Vercel Pro**: $20/month
- **Railway Pro**: $5-20/month
- **Custom Domain**: $10-15/year

## Quick Deploy Script

Create a `deploy.sh` script:

```bash
#!/bin/bash
echo "Deploying PortfoVision..."

# Deploy backend to Railway (requires Railway CLI)
railway up --service backend

# Deploy frontend to Vercel (requires Vercel CLI)
vercel --prod

echo "Deployment complete!"
```

## Support

For deployment issues:

1. Check platform-specific documentation
2. Review error logs
3. Verify environment variables
4. Test locally first

## Next Steps

After deployment:

1. Share your public URL
2. Monitor performance
3. Set up analytics (optional)
4. Configure custom domain (optional)
5. Set up CI/CD for automatic deployments
