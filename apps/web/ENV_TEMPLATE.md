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

# Backend API URL (your oasis backend URL)
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

