#!/bin/bash

# JetLagged - Quick Deploy Script
# This script helps you deploy to Render quickly

echo "🚀 JetLagged Deployment Helper"
echo "================================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
  echo "❌ No git repository found. Initializing..."
  git init
  git add .
  git commit -m "Initial commit"
  echo "✅ Git repository initialized"
else
  echo "✅ Git repository found"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo ""

# Check for environment templates
echo "1. Environment Configuration"
if [ -f "apps/oasis/ENV_TEMPLATE.md" ]; then
  echo "   ✅ Backend environment template exists"
else
  echo "   ⚠️  Backend environment template missing"
fi

if [ -f "apps/web/ENV_TEMPLATE.md" ]; then
  echo "   ✅ Frontend environment template exists"
else
  echo "   ⚠️  Frontend environment template missing"
fi

echo ""
echo "2. Deployment Files"
if [ -f "apps/oasis/Dockerfile" ]; then
  echo "   ✅ Backend Dockerfile exists"
else
  echo "   ❌ Backend Dockerfile missing"
fi

if [ -f "render.yaml" ]; then
  echo "   ✅ Render blueprint exists"
else
  echo "   ❌ Render blueprint missing"
fi

echo ""
echo "3. Documentation"
if [ -f "DEPLOYMENT.md" ]; then
  echo "   ✅ Deployment guide exists"
else
  echo "   ⚠️  Deployment guide missing"
fi

echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Push your code to GitHub:"
echo "   git remote add origin <your-github-repo-url>"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "2. Go to Render Dashboard: https://dashboard.render.com"
echo ""
echo "3. Click 'New' → 'Blueprint'"
echo ""
echo "4. Connect your GitHub repository"
echo ""
echo "5. Render will detect render.yaml and create both services"
echo ""
echo "6. Set environment variables in Render dashboard:"
echo "   Backend:"
echo "   - PRIVATE_KEY (your wallet private key)"
echo "   - AVIATION_EDGE_API_KEY (from aviation-edge.com)"
echo "   - SEPOLIA_RPC_URL (optional, for testnet)"
echo ""
echo "   Frontend:"
echo "   - JWT_SECRET (random secret string)"
echo "   - NEXT_PUBLIC_URL (your frontend URL on Render)"
echo "   - NEXT_PUBLIC_BACKEND_URL (your backend URL on Render)"
echo "   - Farcaster variables (if using Farcaster Frame)"
echo ""
echo "7. Click 'Apply' to deploy!"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "✨ Good luck with your deployment!"

