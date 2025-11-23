# Flight Insurance - Deployment Guide

This guide will help you deploy the Flight Insurance fullstack application (backend + frontend) to Render.

## Architecture

- **Backend (Oasis)**: Bun.js service that resolves flight markets by fetching real-time flight data
- **Frontend (Web)**: Next.js application for users to bet on flight delays

## Prerequisites

1. [Render Account](https://render.com) (free tier works!)
2. GitHub repository with this code
3. Required API keys and secrets

## Environment Variables

### Backend (Oasis App)

Required environment variables for the backend service:

```bash
PORT=10000                                          # Render uses 10000 by default
PRIVATE_KEY=0x...                                   # Private key for resolver wallet
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...  # Optional: Sepolia testnet RPC
CELO_RPC_URL=https://forno.celo.org                # Celo mainnet RPC
CONTRACT_ADDRESS_SEPOLIA=0x49F1b8A77712...         # Sepolia contract address
CONTRACT_ADDRESS_CELO=0x243E571194C89E8B...       # Celo contract address
AVIATION_EDGE_API_KEY=your_api_key                 # Get from aviation-edge.com
```

### Frontend (Web App)

Required environment variables for the frontend service:

```bash
NODE_ENV=production
JWT_SECRET=your_random_secret_here
NEXT_PUBLIC_URL=https://your-app.onrender.com      # Your frontend URL
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_FARCASTER_HEADER=...                   # Optional: Farcaster Frame config
NEXT_PUBLIC_FARCASTER_PAYLOAD=...
NEXT_PUBLIC_FARCASTER_SIGNATURE=...
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com  # Your backend URL
```

## Deployment Options

### Option 1: Using Render Blueprint (Recommended)

1. **Fork/Push this repository to GitHub**

2. **Go to Render Dashboard**: https://dashboard.render.com

3. **Create New > Blueprint**
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - This will create both services (backend + frontend) at once!

4. **Set Environment Variables**
   - After blueprint is loaded, set all the environment variables marked as `sync: false`
   - Backend: Set `PRIVATE_KEY`, `AVIATION_EDGE_API_KEY`, `SEPOLIA_RPC_URL`
   - Frontend: Set `JWT_SECRET`, `NEXT_PUBLIC_URL`, Farcaster variables (if using)

5. **Deploy**
   - Click "Apply" to deploy both services
   - Wait for builds to complete (5-10 minutes)

### Option 2: Manual Deployment

#### Deploy Backend (Oasis)

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Create New > Web Service**
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**:
   - **Name**: `flight-insurance-backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./apps/oasis/Dockerfile`
   - **Docker Context**: `./apps/oasis`
   - **Instance Type**: `Free` (or `Starter` for better performance)

4. **Set Environment Variables**: Add all backend variables listed above

5. **Add Health Check**:
   - Path: `/health`

6. **Deploy**: Click "Create Web Service"

#### Deploy Frontend (Web)

1. **Create New > Web Service**

2. **Configure Service**:
   - **Name**: `flight-insurance-frontend`
   - **Environment**: `Node`
   - **Build Command**: 
     ```bash
     cd apps/web && npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     cd apps/web && npm run start
     ```
   - **Instance Type**: `Free` (or `Starter` for better performance)

3. **Set Environment Variables**: Add all frontend variables listed above
   - **Important**: Set `NEXT_PUBLIC_BACKEND_URL` to your backend service URL

4. **Deploy**: Click "Create Web Service"

## Post-Deployment

### 1. Update Frontend Environment

After backend is deployed, update the frontend's `NEXT_PUBLIC_BACKEND_URL`:

```bash
NEXT_PUBLIC_BACKEND_URL=https://flight-insurance-backend.onrender.com
```

Then redeploy the frontend.

### 2. Update CORS (if needed)

If you have CORS issues, update the backend's CORS settings in `apps/oasis/index.ts`:

```typescript
const headers = {
  "Access-Control-Allow-Origin": "https://your-frontend.onrender.com",
  // ...
};
```

### 3. Test the Deployment

- **Backend Health**: https://your-backend.onrender.com/health
- **Frontend**: https://your-frontend.onrender.com
- **Test Flight Resolution**: Try creating and resolving a market

## Getting API Keys

### Aviation Edge API Key

1. Go to https://aviation-edge.com/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier: 1,000 requests/month

### Infura RPC (Optional)

1. Go to https://infura.io/
2. Sign up and create a new project
3. Copy the Sepolia endpoint URL
4. Free tier: 100,000 requests/day

## Troubleshooting

### Backend Issues

**Issue**: Backend fails to start
- Check that all environment variables are set
- Verify `PRIVATE_KEY` is valid (with or without `0x` prefix)
- Check logs in Render dashboard

**Issue**: Flight resolution fails
- Verify `AVIATION_EDGE_API_KEY` is valid
- Check API quota hasn't been exceeded
- Review backend logs for API errors

### Frontend Issues

**Issue**: Cannot connect to backend
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Ensure backend is deployed and running
- Check CORS configuration

**Issue**: Wallet connection fails
- Verify RPC URL is correct
- Check that Celo chain is properly configured
- Clear browser cache and try again

### Free Tier Limitations

Render's free tier:
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Upgrade to Starter ($7/month) for always-on services

## Monitoring

### Check Service Status

- Render Dashboard: https://dashboard.render.com
- Backend logs: Click on backend service → "Logs"
- Frontend logs: Click on frontend service → "Logs"

### Health Endpoints

- Backend: `GET /health`
- Frontend: Check root URL loads

## Updating

### Automatic Deploys

Both services auto-deploy when you push to your connected branch (usually `main`).

### Manual Deploy

1. Go to Render Dashboard
2. Click on the service
3. Click "Manual Deploy" → "Deploy latest commit"

## Cost Estimate

### Free Tier (Both services free)
- Good for testing and low traffic
- Services sleep after inactivity
- Suitable for demo purposes

### Starter Tier ($7/month per service = $14/month)
- Always-on services
- Better performance
- No cold starts
- Suitable for production

## Support

For issues specific to:
- **Render deployment**: https://render.com/docs
- **This application**: Create an issue in the GitHub repository

## Next Steps

1. ✅ Deploy both services
2. ✅ Test the health endpoints
3. ✅ Create a test flight market
4. ✅ Resolve a market to verify backend works
5. 🚀 Share your app!

## Production Checklist

Before going to production:

- [ ] Update all environment variables with production values
- [ ] Set strong `JWT_SECRET`
- [ ] Configure Farcaster Frame settings (if using)
- [ ] Test all user flows (connect wallet, create market, buy/sell shares, resolve)
- [ ] Monitor API usage (Aviation Edge quota)
- [ ] Set up custom domain (optional)
- [ ] Enable auto-deploy from main branch
- [ ] Set up monitoring/alerts in Render
- [ ] Review security settings
- [ ] Upgrade to paid tier if needed

---

Made with ❤️ for JetLagged - Turn your travel anxiety into profit! ✈️

