# Oasis Backend - Flight Insurance Resolver

Backend service for the Flight Insurance application. This service resolves flight markets by fetching real-time flight data from Aviation Edge API and submitting results to the blockchain.

## Features

- ✈️ Fetches real-time flight status from Aviation Edge API
- 🔗 Resolves markets on both Sepolia and Celo chains
- ⚡ Built with Bun.js for maximum performance
- 🔒 Secure private key management for resolver wallet
- 🌐 CORS-enabled REST API

## API Endpoints

### Health Check
```
GET /health
```

Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "flight-insurance-backend"
}
```

### Resolve Flight Market
```
GET /resolve?flightId=...&departureCode=...&date=...&airlineCode=...&flightNumber=...&chain=C
```

Fetches flight status and resolves the market on-chain.

**Query Parameters:**
- `flightId` (string): Unique market identifier (bytes32 hash)
- `departureCode` (string): IATA airport code (e.g., "JFK")
- `date` (string): Flight date and time (YYYY-MM-DDTHH:MM)
- `airlineCode` (string): IATA airline code (e.g., "AA")
- `flightNumber` (string): Flight number (e.g., "100")
- `chain` (string): "S" for Sepolia, "C" for Celo

**Response:**
```json
{
  "success": true,
  "outcome": 0,
  "outcomeText": "On Time",
  "txHash": "0x...",
  "blockNumber": 123456,
  "flightStatus": {
    "scheduled": "2024-01-01T10:00:00Z",
    "actual": "2024-01-01T10:05:00Z",
    "delayMinutes": 5
  }
}
```

**Outcome Values:**
- `0` = On Time (delay < 15 minutes)
- `1` = Delayed (delay >= 15 minutes)
- `2` = Cancelled

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Create a `.env` file with the following variables (see `ENV_TEMPLATE.md`):

```bash
PRIVATE_KEY=0x...
CELO_RPC_URL=https://forno.celo.org
CONTRACT_ADDRESS_CELO=0x243E571194C89E8B848137EdB46e5A1156272860
AVIATION_EDGE_API_KEY=your_api_key
PORT=4500
```

### 3. Run Development Server

```bash
bun run dev
```

Server runs on http://localhost:4500

### 4. Run Production Server

```bash
bun run start
```

## Docker

### Build Image

```bash
docker build -t flight-insurance-backend .
```

### Run Container

```bash
docker run -p 4500:4500 \
  -e PRIVATE_KEY=0x... \
  -e CELO_RPC_URL=https://forno.celo.org \
  -e CONTRACT_ADDRESS_CELO=0x... \
  -e AVIATION_EDGE_API_KEY=... \
  flight-insurance-backend
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 4500) |
| `PRIVATE_KEY` | Yes | Private key for resolver wallet |
| `CELO_RPC_URL` | Yes | Celo RPC endpoint |
| `CONTRACT_ADDRESS_CELO` | Yes | Celo contract address |
| `AVIATION_EDGE_API_KEY` | Yes | Aviation Edge API key |
| `SEPOLIA_RPC_URL` | No | Sepolia RPC endpoint (for testnet) |
| `CONTRACT_ADDRESS_SEPOLIA` | No | Sepolia contract address (for testnet) |

## Flight Status Logic

The resolver determines flight outcomes based on actual vs scheduled departure times:

```typescript
const delayMinutes = (actualTime - scheduledTime) / 60000;

if (delayMinutes < 15) {
  outcome = 0; // On Time
} else {
  outcome = 1; // Delayed
}

// If flight is cancelled
if (status === "cancelled") {
  outcome = 2; // Cancelled
}
```

## Development

### Project Structure

```
oasis/
├── index.ts           # Main server file
├── package.json       # Dependencies
├── Dockerfile        # Docker configuration
├── ENV_TEMPLATE.md   # Environment variable template
└── README.md         # This file
```

### Tech Stack

- **Runtime**: Bun.js
- **Blockchain**: viem
- **API**: Native Bun.serve()

### Testing Locally

1. Start the server:
   ```bash
   bun run dev
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:4500/health
   ```

3. Test resolve endpoint (replace with real values):
   ```bash
   curl "http://localhost:4500/resolve?flightId=0x123...&departureCode=JFK&date=2024-01-01T10:00&airlineCode=AA&flightNumber=100&chain=C"
   ```

## Deployment

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for detailed deployment instructions to Render.

## Aviation Edge API

This service uses Aviation Edge API for flight data.

- **Free Tier**: 1,000 requests/month
- **Sign up**: https://aviation-edge.com/
- **Docs**: https://aviation-edge.com/developers/

### API Rate Limits

Be mindful of your API quota:
- Cache flight results if possible
- Monitor usage in Aviation Edge dashboard
- Consider upgrading plan for production

## Troubleshooting

### Server won't start

- Check that all required environment variables are set
- Verify private key format (with or without `0x` prefix)
- Ensure Bun is installed: `bun --version`

### Flight resolution fails

- Verify Aviation Edge API key is valid
- Check API quota hasn't been exceeded
- Ensure flight details are correct (IATA codes, date format)
- Review server logs for detailed error messages

### Transaction fails

- Check resolver wallet has sufficient native tokens (CELO)
- Verify contract address is correct
- Ensure RPC endpoint is working
- Check that the market exists and hasn't been resolved yet

## Security

- Never commit `.env` file or expose `PRIVATE_KEY`
- Use a dedicated resolver wallet with minimal funds
- Monitor resolver wallet balance
- Use environment variables for all sensitive data

## License

MIT
