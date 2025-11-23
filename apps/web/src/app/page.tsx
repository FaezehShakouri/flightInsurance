"use client";
import { useMiniApp } from "@/contexts/miniapp-context";
import { sdk } from "@farcaster/frame-sdk";
import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import Link from "next/link";

export default function Home() {
  const { context, isMiniAppReady } = useMiniApp();
  const [isAddingMiniApp, setIsAddingMiniApp] = useState(false);
  const [addMiniAppMessage, setAddMiniAppMessage] = useState<string | null>(
    null
  );

  // Wallet connection hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();

  // Auto-connect wallet when miniapp is ready
  useEffect(() => {
    if (
      isMiniAppReady &&
      !isConnected &&
      !isConnecting &&
      connectors.length > 0
    ) {
      const farcasterConnector = connectors.find((c) => c.id === "farcaster");
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
    }
  }, [isMiniAppReady, isConnected, isConnecting, connectors, connect]);

  // Extract user data from context
  const user = context?.user;
  const displayName = user?.displayName || user?.username || "Traveler";
  const pfpUrl = user?.pfpUrl;

  if (!isMiniAppReady) {
    return (
      <main className="flex-1">
        <section className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="w-full max-w-md mx-auto p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading JetLagged...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <section className="flex items-center justify-center min-h-screen py-12 px-4">
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="text-6xl mb-4">✈️</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Welcome to JetLagged
            </h1>
            <p className="text-xl text-gray-300 max-w-xl mx-auto">
              Turn your travel anxiety into profit. Bet on flight delays and
              cancellations.
            </p>
          </div>

          {/* User Card */}
          {user && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-700">
              <div className="flex items-center gap-4 justify-center mb-4">
                {pfpUrl && (
                  <img
                    src={pfpUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full border-2 border-blue-400"
                  />
                )}
                <div className="text-left">
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="text-lg font-semibold text-white">
                    {displayName}
                  </p>
                </div>
              </div>

              {isConnected && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  Wallet Connected
                </div>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/markets"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
            >
              View Flight Markets
            </Link>
            <button
              onClick={async () => {
                if (isAddingMiniApp) return;

                setIsAddingMiniApp(true);
                setAddMiniAppMessage(null);

                try {
                  await sdk.actions.addMiniApp();
                  setAddMiniAppMessage("✅ Added to your miniapps!");
                } catch (error: any) {
                  console.error("Add miniapp error:", error);
                  const name = error?.name || "";
                  if (name === "RejectedByUser") {
                    setAddMiniAppMessage("Already added or declined");
                  } else {
                    setAddMiniAppMessage("Could not add miniapp");
                  }
                } finally {
                  setIsAddingMiniApp(false);
                }
              }}
              disabled={isAddingMiniApp}
              className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold py-4 px-8 rounded-xl transition-colors duration-200 border-2 border-slate-700 hover:border-blue-400/50"
            >
              {isAddingMiniApp ? "Adding..." : "📱 Add to Farcaster"}
            </button>
          </div>

          {addMiniAppMessage && (
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-gray-300">{addMiniAppMessage}</p>
            </div>
          )}

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-white mb-2">Live Markets</h3>
              <p className="text-sm text-gray-400">
                Bet on real flights with live odds
              </p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl mb-3">⏱️</div>
              <h3 className="font-semibold text-white mb-2">Real-Time</h3>
              <p className="text-sm text-gray-400">
                Prices update based on market demand
              </p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-white mb-2">Win Big</h3>
              <p className="text-sm text-gray-400">
                Predict correctly and earn rewards
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
