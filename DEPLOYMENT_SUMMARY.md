# 🎉 Deployment Preparation Complete!

Your Flight Insurance fullstack application is now ready to deploy to Render!

## ✅ What's Been Added

### 1. Backend (Oasis App)
- ✅ **Dockerfile** - Containerization for backend service
- ✅ **ENV_TEMPLATE.md** - Environment variable documentation
- ✅ **README.md** - Comprehensive backend documentation
- ✅ **.dockerignore** - Optimized Docker builds
- ✅ **Health endpoint** - `/health` for monitoring
- ✅ **Dynamic port** - Uses PORT env variable

### 2. Frontend (Web App)
- ✅ **ENV_TEMPLATE.md** - Environment variable documentation
- ✅ **README.md** - Comprehensive frontend documentation
- ✅ **Auto chain switching** - Automatically prompts users to switch to Celo
- ✅ **Chain warning UI** - Visual indicator for wrong network
- ✅ **Production ready** - Optimized build configuration

### 3. Deployment Files
- ✅ **render.yaml** - Render Blueprint for one-click deployment
- ✅ **DEPLOYMENT.md** - Step-by-step deployment guide
- ✅ **deploy.sh** - Quick deployment helper script
- ✅ **Updated README.md** - Complete project documentation

## 🚀 Quick Deploy to Render

### Method 1: One-Click Blueprint (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy via Blueprint**:
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render auto-detects `render.yaml` and creates both services!

3. **Set Environment Variables**:
   - Backend: `PRIVATE_KEY`, `AVIATION_EDGE_API_KEY`
   - Frontend: `JWT_SECRET`, `NEXT_PUBLIC_URL`

4. **Click "Apply"** and wait 5-10 minutes for deployment!

5. **⚠️ CRITICAL POST-DEPLOYMENT STEP**:
   After backend deploys:
   - Copy backend URL (e.g., `https://flight-insurance-backend.onrender.com`)
   - Go to frontend service → Environment tab
   - Set `NEXT_PUBLIC_OASIS_API_URL` to the backend URL
   - Save changes and manually redeploy frontend
   
   **This step is REQUIRED for market resolution to work!**

### Method 2: Use Helper Script

```bash
./deploy.sh
```

This script will:
- Check your deployment readiness
- Provide a checklist
- Show next steps

## 📋 Environment Variables You Need

### Backend (Required)
```bash
PRIVATE_KEY=0x...                    # Wallet for resolving markets
AVIATION_EDGE_API_KEY=...            # Get from aviation-edge.com
CELO_RPC_URL=https://forno.celo.org  # Already set in render.yaml
CONTRACT_ADDRESS_CELO=0x243E...      # Already set in render.yaml
```

### Frontend (Required)
```bash
JWT_SECRET=random_secret_here
NEXT_PUBLIC_URL=https://your-app.onrender.com

# ⚠️ CRITICAL: Set AFTER backend deploys!
NEXT_PUBLIC_OASIS_API_URL=https://your-backend.onrender.com
```

### Optional (for Farcaster Frame)
```bash
NEXT_PUBLIC_FARCASTER_HEADER=...
NEXT_PUBLIC_FARCASTER_PAYLOAD=...
NEXT_PUBLIC_FARCASTER_SIGNATURE=...
```

## 🔑 Getting API Keys

### 1. Aviation Edge API (Required for Backend)
- Sign up: https://aviation-edge.com/
- Free tier: 1,000 requests/month
- Get API key from dashboard

### 2. Infura RPC (Optional - for Sepolia testnet)
- Sign up: https://infura.io/
- Create new project
- Copy Sepolia endpoint
- Free tier: 100,000 requests/day

## 📖 Documentation Structure

```
flightInsurance/
├── README.md                 # Main project documentation
├── DEPLOYMENT.md            # Detailed deployment guide
├── DEPLOYMENT_SUMMARY.md    # This file
├── deploy.sh                # Quick deploy helper
├── render.yaml              # Render Blueprint config
│
├── apps/
│   ├── oasis/              # Backend
│   │   ├── README.md       # Backend docs
│   │   ├── ENV_TEMPLATE.md # Backend env vars
│   │   ├── Dockerfile      # Docker config
│   │   └── .dockerignore
│   │
│   └── web/                # Frontend
│       ├── README.md       # Frontend docs
│       └── ENV_TEMPLATE.md # Frontend env vars
```

## 🎯 What Each Service Does

### Backend (Port 10000)
- Resolves flight markets by fetching real-time data
- Submits resolution transactions to blockchain
- Provides REST API for frontend
- Endpoints:
  - `GET /health` - Health check
  - `GET /resolve` - Resolve a flight market

### Frontend (Port 10000)
- User interface for betting on flights
- Wallet connection (Farcaster + MetaMask)
- Create markets, buy/sell shares, claim winnings
- Auto-switches to Celo network

## 🏗️ Architecture

```
┌─────────────────┐
│   Users/Wallet  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Frontend (Web) │─────▶│  Backend (Oasis) │
│   Next.js App   │      │   Bun.js Server  │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────────────────────────┐
│      Celo Blockchain               │
│  FlightDelayPredictionMarket.sol   │
└─────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Aviation Edge   │
│   Flight Data    │
└──────────────────┘
```

## ✨ New Features Added

### 1. Auto Chain Switching
Users are automatically prompted to switch to Celo network when connecting with wrong chain:

```typescript
// Automatically switches to Celo
if (chain?.id !== celo.id) {
  switchChain({ chainId: celo.id });
}
```

### 2. Visual Chain Warning
Yellow warning banner appears when on wrong network:

```tsx
<ChainWarning />
// Shows: "Wrong network detected. Please switch to Celo network."
```

### 3. Health Monitoring
Backend has health endpoint for Render monitoring:

```bash
curl https://your-backend.onrender.com/health
# {"status":"ok","timestamp":"...","service":"flight-insurance-backend"}
```

## 🐛 Troubleshooting

### Backend Won't Start
- Check `PRIVATE_KEY` is set correctly
- Ensure wallet has CELO tokens for gas
- Verify contract address matches deployed contract

### Frontend Can't Connect
- Update `NEXT_PUBLIC_BACKEND_URL` after backend deploys
- Check CORS settings in backend
- Verify both services are running

### Markets Won't Resolve
- Check Aviation Edge API key is valid
- Verify API quota hasn't been exceeded
- Ensure flight details are correct

## 💰 Cost Estimate

### Free Tier (Recommended for Testing)
- Backend: Free
- Frontend: Free
- **Total: $0/month**
- ⚠️ Services sleep after 15 min inactivity

### Starter Tier (Production)
- Backend: $7/month
- Frontend: $7/month
- **Total: $14/month**
- ✅ Always-on, no cold starts

## 🎓 Next Steps

1. **Deploy to Render** (follow DEPLOYMENT.md)
2. **Test all functionality**:
   - Connect wallet
   - Create a market
   - Buy shares
   - Resolve market
   - Claim winnings
3. **Monitor services** in Render dashboard
4. **Set up custom domain** (optional)
5. **Share your app!** 🎉

## 📞 Support

- **Deployment issues**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Render docs**: https://render.com/docs
- **Celo docs**: https://docs.celo.org/

## 🎉 You're Ready!

Everything is set up and ready to deploy. Just:
1. Push to GitHub
2. Connect to Render
3. Deploy with Blueprint
4. Set environment variables
5. Go live! 🚀

Good luck with your deployment! ✈️💰

---

**Made with ❤️ for JetLagged**

