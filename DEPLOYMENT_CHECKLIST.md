# 🚀 Pre-Deployment Checklist

Use this checklist before deploying to ensure everything is ready.

## ✅ Code Preparation

- [ ] All code committed to git
- [ ] No sensitive data in code (check for hardcoded keys)
- [ ] `.env` files are in `.gitignore`
- [ ] All dependencies installed (`pnpm install`)
- [ ] Code builds successfully locally:
  - [ ] `cd apps/web && pnpm build`
  - [ ] `cd apps/oasis && bun run start`

## ✅ Environment Variables

### Backend (Oasis)

- [ ] `PRIVATE_KEY` - Wallet private key for resolver
- [ ] `AVIATION_EDGE_API_KEY` - API key from aviation-edge.com
- [ ] `CELO_RPC_URL` - Celo RPC endpoint (default: https://forno.celo.org)
- [ ] `CONTRACT_ADDRESS_CELO` - Deployed contract address on Celo
- [ ] `PORT` - Server port (Render uses 10000)

### Frontend (Web)

- [ ] `JWT_SECRET` - Random secret for JWT signing
- [ ] `NEXT_PUBLIC_URL` - Your frontend URL
- [ ] `NEXT_PUBLIC_APP_ENV` - Set to "production"
- [ ] `NEXT_PUBLIC_RPC_URL` - Celo RPC (https://forno.celo.org)
- [ ] `NEXT_PUBLIC_BACKEND_URL` - Your backend URL (set after backend deploys)
- [ ] (Optional) Farcaster Frame variables if using Frames

## ✅ External Services

- [ ] Aviation Edge account created and API key obtained
- [ ] Resolver wallet has CELO tokens for gas
- [ ] Smart contract deployed to Celo (verify address)
- [ ] GitHub repository created and code pushed
- [ ] Render account created

## ✅ Smart Contracts

- [ ] Contract deployed to Celo mainnet
- [ ] Contract address saved in `apps/web/src/lib/contract.ts`
- [ ] Contract address added to backend env vars
- [ ] Resolver wallet authorized in contract (if needed)
- [ ] Test transactions work on-chain

## ✅ Testing

### Local Testing

- [ ] Backend health endpoint works: `curl http://localhost:4500/health`
- [ ] Frontend loads: http://localhost:3000
- [ ] Wallet connection works
- [ ] Can create a market
- [ ] Can buy/sell shares
- [ ] Market resolution works
- [ ] Can claim winnings

### Blockchain Testing

- [ ] Connected to correct network (Celo)
- [ ] Transactions submit successfully
- [ ] Gas fees are reasonable
- [ ] Contract interactions work

## ✅ Deployment Files

- [ ] `render.yaml` exists in root
- [ ] `apps/oasis/Dockerfile` exists
- [ ] `apps/oasis/.dockerignore` exists
- [ ] `DEPLOYMENT.md` reviewed
- [ ] `README.md` updated

## ✅ Security

- [ ] No private keys in code
- [ ] Environment variables are secure
- [ ] CORS configured correctly in backend
- [ ] Contract addresses verified
- [ ] RPC endpoints are reliable

## ✅ Documentation

- [ ] README.md is up to date
- [ ] DEPLOYMENT.md reviewed
- [ ] ENV_TEMPLATE.md files exist for both apps
- [ ] API endpoints documented

## 🚀 Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Render

- [ ] Go to https://dashboard.render.com
- [ ] Click "New" → "Blueprint"
- [ ] Connect GitHub repository
- [ ] Wait for Render to detect `render.yaml`
- [ ] Review services to be created

### 3. Configure Environment

- [ ] Add backend environment variables
- [ ] Add frontend environment variables
- [ ] Verify all required vars are set

### 4. Deploy

- [ ] Click "Apply" to start deployment
- [ ] Wait for both services to build (5-10 minutes)
- [ ] Check deployment logs for errors

### 5. Post-Deployment

- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend loads: `https://your-frontend.onrender.com`
- [ ] Update frontend `NEXT_PUBLIC_BACKEND_URL` with backend URL
- [ ] Trigger frontend redeploy after backend URL is set

### 6. Smoke Testing

- [ ] Connect wallet on deployed site
- [ ] Auto-switch to Celo works
- [ ] Create a test market
- [ ] Buy shares
- [ ] Check market display
- [ ] (After flight time) Resolve market
- [ ] Claim winnings

## ✅ Monitoring

- [ ] Backend service is running
- [ ] Frontend service is running
- [ ] Check logs in Render dashboard
- [ ] Monitor API usage (Aviation Edge)
- [ ] Monitor resolver wallet balance

## ✅ Optional Enhancements

- [ ] Set up custom domain
- [ ] Configure SSL certificate
- [ ] Set up monitoring alerts
- [ ] Enable auto-deploy from main branch
- [ ] Upgrade to paid tier for always-on services
- [ ] Add analytics
- [ ] Set up error tracking (e.g., Sentry)

## 🐛 Troubleshooting

If deployment fails:

1. **Check Render Logs**

   - Backend logs for startup errors
   - Frontend logs for build errors

2. **Verify Environment Variables**

   - All required vars are set
   - Values are correct (no typos)
   - Private key has correct format

3. **Test Locally First**

   - Build succeeds locally
   - All tests pass
   - Backend starts successfully

4. **Check External Services**
   - Aviation Edge API working
   - RPC endpoints accessible
   - Contract deployed correctly

## 📞 Getting Help

- **Deployment Guide**: See `DEPLOYMENT.md`
- **Render Docs**: https://render.com/docs
- **Celo Docs**: https://docs.celo.org/
- **Project README**: See `README.md`

## ✅ Post-Launch

After successful deployment:

- [ ] Announce on social media
- [ ] Share with Farcaster community
- [ ] Monitor usage and performance
- [ ] Gather user feedback
- [ ] Plan improvements
- [ ] Keep dependencies updated
- [ ] Monitor costs

## 🎉 Success!

When all items are checked:

- Your app is deployed
- Users can access it
- Everything works correctly
- You're making money! 💰

---

**Good luck with your deployment!** ✈️

If you need help, refer to `DEPLOYMENT.md` or create an issue.
