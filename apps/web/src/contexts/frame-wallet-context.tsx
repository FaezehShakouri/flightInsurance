"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useSwitchChain,
} from "wagmi";
import { celo } from "wagmi/chains";
import { metaMask } from "@wagmi/connectors";
import { env } from "@/lib/env";

const config = createConfig({
  chains: [celo],
  connectors: [farcasterMiniApp()],
  transports: {
    [celo.id]: http(env.NEXT_PUBLIC_RPC_URL || "https://forno.celo.org"),
  },
});

const queryClient = new QueryClient();

// Component to handle automatic chain switching
function ChainSwitcher() {
  const { chain, isConnected, connector } = useAccount();
  const { switchChain, switchChainAsync } = useSwitchChain();
  const [hasSwitched, setHasSwitched] = useState(false);

  useEffect(() => {
    async function handleChainSwitch() {
      // Auto-switch to Celo if connected but on wrong chain
      if (isConnected && chain && chain.id !== celo.id && !hasSwitched) {
        console.log(`Current chain: ${chain.id} (${chain.name})`);
        console.log(`Target chain: ${celo.id} (Celo)`);
        console.log(`Connector: ${connector?.name}`);

        try {
          if (switchChainAsync) {
            console.log("Attempting to switch chain using switchChainAsync...");
            await switchChainAsync({ chainId: celo.id });
            console.log("Successfully switched to Celo!");
            setHasSwitched(true);
          } else if (switchChain) {
            console.log("Attempting to switch chain using switchChain...");
            switchChain({ chainId: celo.id });
            setHasSwitched(true);
          } else {
            console.warn("No switchChain method available");
          }
        } catch (error: any) {
          console.error("Failed to switch chain:", error);

          // Try to add the network if it doesn't exist
          if (
            error?.code === 4902 ||
            error?.message?.includes("Unrecognized chain")
          ) {
            console.log("Attempting to add Celo network...");
            try {
              await (window as any).ethereum?.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: `0x${celo.id.toString(16)}`,
                    chainName: celo.name,
                    nativeCurrency: celo.nativeCurrency,
                    rpcUrls: [
                      env.NEXT_PUBLIC_RPC_URL || "https://forno.celo.org",
                    ],
                    blockExplorerUrls: celo.blockExplorers?.default
                      ? [celo.blockExplorers.default.url]
                      : ["https://explorer.celo.org"],
                  },
                ],
              });
              console.log("Celo network added successfully!");
              setHasSwitched(true);
            } catch (addError) {
              console.error("Failed to add Celo network:", addError);
            }
          }
        }
      }
    }

    handleChainSwitch();
  }, [
    isConnected,
    chain,
    switchChain,
    switchChainAsync,
    connector,
    hasSwitched,
  ]);

  // Reset hasSwitched when disconnected
  useEffect(() => {
    if (!isConnected) {
      setHasSwitched(false);
    }
  }, [isConnected]);

  return null;
}

export default function FrameWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ChainSwitcher />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
