# JetLagged Frontend - Next.js Application

Frontend application for the Flight Insurance prediction market platform.

## Features

- 🎯 Create flight delay prediction markets
- 📈 Buy and sell outcome shares with AMM pricing
- 💰 Claim winnings after market resolution
- 🔗 Farcaster Frame integration
- 🌐 Auto-switch to Celo network
- 📱 Mobile-responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- PNPM package manager

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env.local` file (see `ENV_TEMPLATE.md` for details):

```bash
JWT_SECRET=your_random_secret
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_BACKEND_URL=http://localhost:4500
```

### Development

```bash
pnpm dev
```

Open http://localhost:3000

### Production Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
web/
├── src/
│   ├── app/              # Next.js pages (App Router)
│   │   ├── page.tsx      # Home page
│   │   ├── markets/      # Markets listing
│   │   ├── bet/          # Betting interface
│   │   └── api/          # API routes
│   │
│   ├── components/       # React components
│   │   ├── ui/           # Base UI components (shadcn)
│   │   ├── navbar.tsx
│   │   ├── connect-button.tsx
│   │   ├── chain-warning.tsx
│   │   └── ...
│   │
│   ├── contexts/         # React contexts
│   │   ├── frame-wallet-context.tsx
│   │   └── miniapp-context.tsx
│   │
│   ├── hooks/            # Custom hooks
│   │   └── use-api.ts
│   │
│   └── lib/              # Utilities
│       ├── contract.ts   # Contract config
│       ├── env.ts        # Environment validation
│       └── utils.ts      # Helper functions
│
├── public/              # Static assets
├── package.json
└── next.config.js
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Blockchain**: 
  - Wagmi v2 (React hooks)
  - Viem (Ethereum library)
- **State Management**: 
  - React Query (TanStack Query)
  - React Context
- **Wallet Connection**:
  - Farcaster MiniApp Connector
  - MetaMask
- **Form Validation**: Zod
- **Auth**: Jose (JWT)

## Key Features

### Wallet Connection

Automatically connects to Farcaster wallet when running in mini-app, with MetaMask fallback:

```typescript
// Auto-connect on mount
const { connect, connectors } = useConnect();
const farcasterConnector = connectors.find(c => c.id === 'farcaster');
```

### Auto Chain Switching

Automatically prompts users to switch to Celo network:

```typescript
// In frame-wallet-context.tsx
useEffect(() => {
  if (chain?.id !== celo.id) {
    switchChain({ chainId: celo.id });
  }
}, [chain]);
```

### Market Creation

```typescript
// Create a new flight market
const { data: hash } = useWriteContract({
  address: FLIGHT_MARKET_CONTRACT_ADDRESS,
  abi: contractAbi,
  functionName: 'createMarket',
  args: [flightNumber, departureAirport, departureTime],
});
```

### Buy/Sell Shares

AMM-based pricing with automatic price updates:

```typescript
const { data: hash } = useWriteContract({
  address: FLIGHT_MARKET_CONTRACT_ADDRESS,
  abi: contractAbi,
  functionName: 'buyShares',
  args: [marketId, outcome, amount],
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `NEXT_PUBLIC_URL` | Yes | Public URL of the app |
| `NEXT_PUBLIC_APP_ENV` | Yes | `development` or `production` |
| `NEXT_PUBLIC_RPC_URL` | Yes | Celo RPC endpoint |
| `NEXT_PUBLIC_BACKEND_URL` | No | Backend resolver API URL |
| `NEXT_PUBLIC_FARCASTER_*` | No | Farcaster Frame config |

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler check

## Components

### UI Components

Base components from shadcn/ui:
- `Button` - Styled button component
- `Dialog` - Modal dialog
- `Input` - Form input
- `Card` - Content card

### Custom Components

- `Navbar` - Navigation bar with wallet connection
- `ChainWarning` - Warning banner for wrong network
- `ConnectButton` - Wallet connection button
- `CreateFlightMarketDialog` - Market creation modal
- `BuySellSharesDialog` - Trading interface

### Contexts

- `FrameWalletProvider` - Wagmi configuration and chain switching
- `MiniAppContext` - Farcaster mini-app integration

## Styling

Uses Tailwind CSS with custom configuration:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      // Custom color palette
    },
    animation: {
      // Custom animations
    }
  }
}
```

## Deployment

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for deployment to Render.

### Build Configuration

The app is optimized for production:

```js
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // ... other optimizations
};
```

## Troubleshooting

### Common Issues

**Issue**: Wallet won't connect
- Clear browser cache
- Try different wallet connector
- Check browser console for errors

**Issue**: Wrong network detected
- Click "Switch to Celo" button in warning banner
- Manually switch network in wallet
- Ensure Celo is added to your wallet

**Issue**: Transaction fails
- Check you have sufficient CUSD tokens
- Ensure you have CELO for gas
- Verify contract address is correct

**Issue**: Market data not loading
- Check backend is running
- Verify RPC endpoint is accessible
- Check browser console for API errors

## Development Tips

### Hot Reload

Next.js supports hot module replacement:

```bash
pnpm dev
# Edit any file and see changes instantly
```

### TypeScript

Full TypeScript support with strict mode:

```typescript
// Enable strict checks
"strict": true
```

### Debugging

Use React DevTools and browser console:

```typescript
console.log('Debug:', { address, chain, isConnected });
```

## Testing

### Manual Testing Checklist

- [ ] Connect wallet successfully
- [ ] Auto-switch to Celo network
- [ ] Create a flight market
- [ ] Buy shares for different outcomes
- [ ] Check market display updates
- [ ] Resolve market (via backend)
- [ ] Claim winnings
- [ ] Disconnect wallet

## Performance

- Optimized with Next.js Image component
- Code splitting and lazy loading
- React Query caching for blockchain data
- Minimal bundle size with tree shaking

## Security

- Environment variables validation with Zod
- JWT token authentication
- CORS configuration
- Input sanitization
- Contract address validation

## License

MIT

