# ⚠️ CRITICAL: Backend URL Configuration

## Why This Matters

The frontend needs to know where to send API requests to resolve flight markets. Without the correct backend URL, **market resolution will NOT work**.

## The Two-Step Deployment Process

```
Step 1: Deploy Backend
┌─────────────────────────┐
│  Backend Deploys First  │
│  Gets URL:              │
│  https://flight-        │
│  insurance-backend      │
│  .onrender.com          │
└────────┬────────────────┘
         │
         │ Copy this URL!
         │
         ▼
Step 2: Configure Frontend
┌─────────────────────────┐
│  Set Environment Var:   │
│  NEXT_PUBLIC_OASIS_     │
│  API_URL=               │
│  https://...backend...  │
└────────┬────────────────┘
         │
         │ Redeploy!
         │
         ▼
┌─────────────────────────┐
│  Frontend Redeploys     │
│  with Backend URL       │
│  ✅ Market Resolution   │
│  Now Works!             │
└─────────────────────────┘
```

## Step-by-Step Instructions

### 1. Wait for Backend to Deploy

After clicking "Apply" on Render Blueprint:

1. Watch the backend service build and deploy (3-5 minutes)
2. Wait until you see "Deploy succeeded" or "Live" status
3. Click on the `flight-insurance-backend` service

### 2. Copy Backend URL

In the backend service page:

1. Look at the top where it shows the service URL
2. Copy the full URL (e.g., `https://flight-insurance-backend.onrender.com`)
3. **DO NOT** add `/health` or any path - just the base URL

### 3. Update Frontend Environment

1. Go back to Render Dashboard
2. Click on `flight-insurance-frontend` service
3. Click "Environment" tab on the left
4. Find `NEXT_PUBLIC_OASIS_API_URL` or add it if not there
5. Paste the backend URL: `https://flight-insurance-backend.onrender.com`
6. Click "Save Changes"

### 4. Redeploy Frontend

1. Stay on the frontend service page
2. Click "Manual Deploy" button (top right)
3. Select "Deploy latest commit"
4. Wait for frontend to rebuild (5-7 minutes)

### 5. Verify It Works

1. Open your frontend URL in browser
2. Open browser console (F12)
3. Try to resolve a market (you'll need to create one first)
4. Check console - you should see API calls to your backend URL
5. No CORS errors = Success! ✅

## Common Mistakes

### ❌ Wrong:
```
NEXT_PUBLIC_OASIS_API_URL=http://localhost:4500
NEXT_PUBLIC_OASIS_API_URL=https://flight-insurance-backend.onrender.com/health
NEXT_PUBLIC_OASIS_API_URL=https://flight-insurance-frontend.onrender.com
```

### ✅ Correct:
```
NEXT_PUBLIC_OASIS_API_URL=https://flight-insurance-backend.onrender.com
```

## Troubleshooting

### "Cannot resolve market" or "API error"

**Problem**: Frontend can't reach backend

**Solution**:
1. Check `NEXT_PUBLIC_OASIS_API_URL` is set correctly
2. Verify backend is running: `curl https://your-backend.onrender.com/health`
3. Check browser console for error messages
4. Make sure you redeployed frontend after setting the URL

### CORS errors in browser console

**Problem**: Backend CORS not configured for frontend

**Solution**:
The backend has CORS set to `*` (allow all), so this shouldn't happen. If it does:
1. Check backend logs in Render dashboard
2. Verify backend health endpoint works
3. Try clearing browser cache

### Frontend shows "http://localhost:4500"

**Problem**: Environment variable not set or frontend not redeployed

**Solution**:
1. Double-check environment variable is saved
2. Trigger a manual redeploy of frontend
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## Why Can't This Be Automatic?

Render Blueprint deploys both services simultaneously, so neither knows the other's URL at build time. The frontend needs to be redeployed after the backend URL is known.

Some platforms (like Vercel + Railway) support automatic URL sharing, but on Render you need to do this manual step.

## Quick Reference

```bash
# 1. Get backend URL
Backend Service → Copy URL

# 2. Set in frontend
Frontend Service → Environment → Add/Edit:
NEXT_PUBLIC_OASIS_API_URL=https://flight-insurance-backend.onrender.com

# 3. Redeploy frontend
Manual Deploy → Deploy latest commit

# 4. Test
curl https://your-backend.onrender.com/health
open https://your-frontend.onrender.com
```

---

**Remember**: This is a **ONE-TIME** setup step. Once configured, both services will auto-deploy on future git pushes without needing this step again (unless you change service names).

