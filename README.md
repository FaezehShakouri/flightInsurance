# JetLagged - Flight Delay Prediction Markets ✈️

> Turn your travel anxiety into profit!

A decentralized prediction market platform built on Celo where users can bet on flight delays and cancellations. Built with Next.js, Bun.js, Solidity, and deployed on Celo blockchain.

## 🎯 Features

- **Live Flight Markets**: Bet on real flights with live odds
- **Real-Time Pricing**: AMM-based pricing that updates based on market demand
- **Decentralized Resolution**: Automated flight status verification via backend oracle
- **Farcaster Integration**: Works as a Farcaster Frame mini-app
- **Celo Blockchain**: Fast, low-cost transactions on Celo network
- **Auto Chain Switching**: Automatically prompts users to switch to Celo

## 🏗️ Architecture

This is a fullstack monorepo with three main components:

```
flightInsurance/
├── apps/
│   ├── contracts/     # Solidity smart contracts (Foundry)
│   ├── oasis/        # Backend resolver service (Bun.js)
│   └── web/          # Frontend application (Next.js)
├── DEPLOYMENT.md     # Deployment guide for Render
└── render.yaml       # Render blueprint configuration
```

### Components

1. **Smart Contracts** (`apps/contracts/`)

   - Solidity contracts for prediction markets
   - AMM-based pricing mechanism
   - Deployed on Celo mainnet and Sepolia testnet
   - Built with Foundry

2. **Backend Resolver** (`apps/oasis/`)

   - use oasis TEE
   - Bun.js REST API
   - Fetches real-time flight data from Aviation Edge API
   - Resolves markets on-chain
   - Dockerized for easy deployment

3. **Frontend** (`apps/web/`)
   - Next.js 14 with App Router
   - Wagmi + Viem for blockchain interactions
   - Farcaster Frame integration
   - Tailwind CSS + shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and PNPM
- Bun (for backend)
- Foundry (for contracts)

### Installation

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd flightInsurance
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - See `apps/oasis/ENV_TEMPLATE.md` for backend
   - See `apps/web/ENV_TEMPLATE.md` for frontend

### Development

Run all services in development mode:

```bash
pnpm dev
```

Or run individually:

```bash
# Frontend (port 3000)
cd apps/web && pnpm dev

# Backend (port 4500)
cd apps/oasis && bun run dev

# Smart contracts
cd apps/contracts && forge test
```

## 📦 Deployment

### Quick Deploy to Render

1. **Push to GitHub**

2. **Use Render Blueprint**:

   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your repository
   - Render will automatically set up both services!

3. **Configure Environment Variables**:

   - Set backend secrets (PRIVATE_KEY, AVIATION_EDGE_API_KEY)
   - Set frontend secrets (JWT_SECRET, Farcaster config)

4. **Deploy**: Click "Apply" and wait for builds to complete

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🔧 Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Blockchain**: Wagmi v2 + Viem
- **State**: React Query
- **Wallet**: Farcaster Mini App Connector + MetaMask

### Backend

- **Runtime**: Bun.js
- **Language**: TypeScript
- **Blockchain**: Viem
- **API**: Aviation Edge (flight data)

### Smart Contracts

- **Language**: Solidity 0.8.20
- **Framework**: Foundry
- **Chain**: Celo (mainnet)
- **Testnet**: Sepolia

## 📋 Project Structure

```
flightInsurance/
├── apps/
│   ├── contracts/          # Smart contracts
│   │   ├── src/
│   │   │   ├── FlightMarkets.sol
│   │   │   └── mocks/
│   │   ├── script/        # Deployment scripts
│   │   ├── test/          # Contract tests
│   │   └── foundry.toml
│   │
│   ├── oasis/             # Backend resolver
│   │   ├── index.ts       # Main server
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── web/               # Frontend app
│       ├── src/
│       │   ├── app/       # Next.js pages
│       │   ├── components/ # UI components
│       │   ├── contexts/  # React contexts
│       │   ├── hooks/     # Custom hooks
│       │   └── lib/       # Utilities
│       └── package.json
│
├── render.yaml            # Render deployment config
├── DEPLOYMENT.md          # Deployment guide
└── package.json           # Root package.json
```

## 🎮 How It Works

### 1. Create a Market

Users can create prediction markets for specific flights:

- Enter flight details (airline, flight number, date, departure airport)
- Market automatically created on Celo blockchain
- Initial shares minted based on AMM curve

### 2. Trade Shares

Users bet on outcomes by buying/selling shares:

- **On Time**: Flight departs within 15 minutes of scheduled time
- **Delayed**: Flight delayed by 15+ minutes
- **Cancelled**: Flight is cancelled
- Prices adjust automatically based on demand (AMM)

### 3. Market Resolution

After flight departure:

- Backend fetches actual flight status from Aviation Edge API
- Compares actual vs scheduled departure time
- Submits resolution transaction to blockchain
- Winners can claim their payouts

### 4. Claim Winnings

If your prediction was correct:

- Redeem your winning shares
- Receive CUSD tokens
- Profit! 💰

## 📊 Smart Contract Details

### Contract Addresses

- **Celo Mainnet**: `0x243E571194C89E8B848137EdB46e5A1156272860`
- **Sepolia Testnet**: `0x49F1b8A77712Edf77Fa5d04D07d77a846B23A91B`

### Key Functions

```solidity
// Create a new flight market
function createMarket(
    string flightNumber,
    string departureAirport,
    uint256 departureTime
) external returns (bytes32 marketId)

// Buy outcome shares
function buyShares(
    bytes32 marketId,
    uint8 outcome,
    uint256 amount
) external

// Resolve market (resolver only)
function resolveMarket(
    bytes32 flightId,
    uint8 outcome
) external

// Claim winnings
function claimWinnings(bytes32 marketId) external
```

## 🔑 Environment Setup

### Backend Environment Variables

Create `apps/oasis/.env`:

```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
CELO_RPC_URL=https://forno.celo.org
CONTRACT_ADDRESS_CELO=0x243E571194C89E8B848137EdB46e5A1156272860
AVIATION_EDGE_API_KEY=your_api_key
PORT=4500
```

### Frontend Environment Variables

Create `apps/web/.env.local`:

```bash
JWT_SECRET=your_random_secret
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_BACKEND_URL=http://localhost:4500
```

## 🧪 Testing

### Smart Contracts

```bash
cd apps/contracts
forge test
forge test -vvv  # Verbose output
```

### Local Testing Flow

1. Start backend:

   ```bash
   cd apps/oasis
   bun run dev
   ```

2. Start frontend:

   ```bash
   cd apps/web
   pnpm dev
   ```

3. Connect wallet and create a test market
4. Buy shares for different outcomes
5. Resolve market via backend API
6. Claim winnings

## 📚 Available Scripts

### Root

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages

### Frontend (`apps/web`)

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Lint code

### Backend (`apps/oasis`)

- `bun run dev` - Start with hot reload
- `bun run start` - Start production server
- `bun test` - Run tests

### Contracts (`apps/contracts`)

- `forge build` - Compile contracts
- `forge test` - Run tests
- `forge script script/FlightMarkets.s.sol --rpc-url celo --broadcast` - Deploy to Celo

## 🌐 API Endpoints

### Backend API

**Base URL**: `http://localhost:4500` (dev) or your deployed URL

#### Health Check

```
GET /health
```

#### Resolve Market

```
GET /resolve?flightId=...&departureCode=...&date=...&airlineCode=...&flightNumber=...&chain=C
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Wrong network" error

- **Solution**: Make sure you're connected to Celo network. The app will auto-prompt to switch.

**Issue**: Backend can't resolve markets

- **Solution**: Check that PRIVATE_KEY is set and wallet has CELO tokens for gas.

**Issue**: Flight data not found

- **Solution**: Ensure flight details are correct and flight has actually departed.

**Issue**: Transaction fails

- **Solution**: Check you have sufficient CUSD tokens and the market hasn't been resolved yet.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Live App**: [Your deployed URL]

## 💡 Inspiration

Ever been anxious about your flight being delayed? Why not make money from that anxiety! JetLagged lets you bet on flight outcomes, turning travel stress into potential profit.

## 🙏 Acknowledgments

- Built for Celo blockchain
- Uses Aviation Edge for real-time flight data
- Powered by Farcaster Frames
- UI components from shadcn/ui

---

Made with ❤️ by the JetLagged team. Safe travels! ✈️

- @zkfriendly: full-stack dev
- @FaezehShakouri: front-end dev
