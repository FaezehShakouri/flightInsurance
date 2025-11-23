"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { metaMask } from "@wagmi/connectors";
import { env } from "@/lib/env";

const config = createConfig({
  chains: [sepolia],
  connectors: [farcasterMiniApp(), metaMask()],
  transports: {
    [sepolia.id]: http(env.NEXT_PUBLIC_RPC_URL),
  },
});

const queryClient = new QueryClient();

export default function FrameWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
