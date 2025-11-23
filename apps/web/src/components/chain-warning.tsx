"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { useEffect, useState } from "react";

export function ChainWarning() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isConnected && chain && chain.id !== celo.id) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [isConnected, chain]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm text-black py-3 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-medium">
            Wrong network detected. Please switch to Celo network.
          </p>
        </div>
        <button
          onClick={() => switchChain?.({ chainId: celo.id })}
          className="bg-black text-yellow-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Switch to Celo
        </button>
      </div>
    </div>
  );
}

