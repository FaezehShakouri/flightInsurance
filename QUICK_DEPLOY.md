# 🚀 Quick Deployment Reference

## One-Command Deploy

```bash
./deploy.sh
```

## Manual Deploy to Render

### 1️⃣ Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2️⃣ Deploy on Render
1. Go to: https://dashboard.render.com
2. Click: **New** → **Blueprint**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml`

### 3️⃣ Set Environment Variables

**Backend:**
```
PRIVATE_KEY=0x...
AVIATION_EDGE_API_KEY=...
```

**Frontend:**
```
JWT_SECRET=random_secret_string
NEXT_PUBLIC_URL=https://your-frontend.onrender.com
```

### 4️⃣ Deploy!
Click **"Apply"** and wait 5-10 minutes

### 5️⃣ ⚠️ CRITICAL: Update Frontend with Backend URL

**After backend deploys:**

1. Copy backend URL: `https://flight-insurance-backend.onrender.com`
2. Go to frontend service → Environment tab
3. Set `NEXT_PUBLIC_OASIS_API_URL` to backend URL
4. Click "Save Changes"
5. Manual Deploy → "Deploy latest commit"

**This step is REQUIRED for market resolution to work!**

---

## 📋 Important URLs

- **Render Dashboard**: https://dashboard.render.com
- **Aviation Edge**: https://aviation-edge.com
- **Celo Explorer**: https://explorer.celo.org

## 🔑 Get API Keys

1. **Aviation Edge**: Sign up → Get API key (1,000 free requests/month)
2. **Infura** (optional): Sign up → Create project → Copy Sepolia URL

## 🧪 Test After Deploy

```bash
# Test backend health
curl https://your-backend.onrender.com/health

# Open frontend
open https://your-frontend.onrender.com
```

## 📊 Service Status

| Service  | Port  | Status |
|----------|-------|--------|
| Backend  | 10000 | Check `/health` |
| Frontend | 10000 | Check root URL |

## 💰 Cost

- **Free Tier**: $0/month (sleeps after 15min)
- **Starter**: $14/month ($7 × 2 services, always-on)

## 📚 Documentation

- `README.md` - Project overview
- `DEPLOYMENT.md` - Detailed guide
- `DEPLOYMENT_SUMMARY.md` - What was added
- `DEPLOYMENT_CHECKLIST.md` - Pre-launch checklist
- `apps/oasis/README.md` - Backend docs
- `apps/web/README.md` - Frontend docs

## 🐛 Quick Fixes

**Backend won't start?**
- Check `PRIVATE_KEY` is set
- Verify wallet has CELO for gas

**Frontend can't connect?**
- Update `NEXT_PUBLIC_BACKEND_URL`
- Redeploy frontend

**Wallet won't connect?**
- Check you're on Celo network
- Click "Switch to Celo" button

## 🎯 Next Steps

1. ✅ Deploy to Render
2. ✅ Test all features
3. ✅ Share with users
4. 🚀 Make money!

---

**Need help?** See `DEPLOYMENT.md` for detailed instructions.

