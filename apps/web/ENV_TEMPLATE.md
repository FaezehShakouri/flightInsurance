# Environment Variables Template

Copy this template to `.env.local` file in the web app directory.

```bash
# JWT Secret for authentication
JWT_SECRET=your_jwt_secret_here

# Public URL of your deployment
NEXT_PUBLIC_URL=https://your-app.onrender.com

# App Environment
NEXT_PUBLIC_APP_ENV=production

# Farcaster Frame Configuration (get from Farcaster)
NEXT_PUBLIC_FARCASTER_HEADER=
NEXT_PUBLIC_FARCASTER_PAYLOAD=
NEXT_PUBLIC_FARCASTER_SIGNATURE=

# RPC URL for Celo network
NEXT_PUBLIC_RPC_URL=https://forno.celo.org

# ⚠️ CRITICAL: Backend API URL (your oasis backend URL)
# Set this AFTER backend is deployed!
# Example: https://flight-insurance-backend.onrender.com
NEXT_PUBLIC_OASIS_API_URL=https://your-backend.onrender.com
```

## Important Notes

### Backend URL Configuration

The `NEXT_PUBLIC_OASIS_API_URL` is **critical** for the frontend to communicate with the backend.

**Two-Step Deployment Process:**

1. **Deploy Backend First** - Wait for backend to deploy and get its URL
2. **Set Backend URL** - Copy the backend URL (e.g., `https://flight-insurance-backend.onrender.com`)
3. **Update Frontend** - Set `NEXT_PUBLIC_OASIS_API_URL` to the backend URL
4. **Redeploy Frontend** - Trigger a manual redeploy to pick up the new environment variable

Without this, the frontend **cannot resolve flight markets** or make API calls to the backend!

