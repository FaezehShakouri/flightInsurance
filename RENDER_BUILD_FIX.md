# Render Deployment Fix - Tailwind CSS Missing

## Problem

Build fails on Render with error:
```
Cannot find module 'tailwindcss'
```

## Root Cause

By default, Render's production builds don't install `devDependencies`. Tailwind CSS and related build tools were in `devDependencies`, causing the build to fail.

## Solution

Moved build-time dependencies to `dependencies` in `package.json`:

- `tailwindcss`
- `postcss`
- `autoprefixer`
- `tailwindcss-animate`
- `typescript`

## Changes Made

### Before (apps/web/package.json):
```json
{
  "dependencies": {
    "next": "^14.0.0",
    ...
  },
  "devDependencies": {
    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17",
    "typescript": "^5.2.2"
  }
}
```

### After (apps/web/package.json):
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17",
    "typescript": "^5.2.2",
    ...
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    ...
  }
}
```

## Why This Works

In production builds:
- `npm install` only installs `dependencies` by default
- `npm install --production` explicitly skips `devDependencies`
- Build tools like Tailwind CSS are needed during the build step, even in production

By moving them to `dependencies`, they're always available when building on Render.

## Alternative Solutions (Not Recommended)

You could also:
1. Use `npm install --include=dev` in build command (not recommended, installs unnecessary dev tools)
2. Set `NODE_ENV=development` during build (not recommended, can cause other issues)

## Verification

Test locally:
```bash
cd apps/web
rm -rf node_modules
npm install --production
npm run build
```

Should build successfully without errors.

