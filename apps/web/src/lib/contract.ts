// Contract addresses for different chains
export const CONTRACT_ADDRESSES = {
  sepolia: "0x49F1b8A77712Edf77Fa5d04D07d77a846B23A91B" as const,
  celo: "0x243E571194C89E8B848137EdB46e5A1156272860" as const,
};

// Default to Celo
export const FLIGHT_MARKET_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.celo;
