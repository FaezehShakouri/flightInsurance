"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FLIGHT_MARKET_CONTRACT_ADDRESS } from "@/lib/contract";
import FlightMarketABI from "@/app/abi.json";

interface BuySellSharesDialogProps {
  flightId: string;
  flightNumber: string;
  outcomeType: number; // 1=ON_TIME, 2=DELAYED30, 3=DELAYED120_PLUS, 4=CANCELLED
  outcomeName: string;
  yesPrice?: number; // Current YES price (0-1)
  noPrice?: number; // Current NO price (0-1)
  onSuccess?: () => void;
}

export function BuySellSharesDialog({
  flightId,
  flightNumber,
  outcomeType,
  outcomeName,
  yesPrice = 0.5,
  noPrice = 0.5,
  onSuccess,
}: BuySellSharesDialogProps) {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(true);
  const [position, setPosition] = useState<"YES" | "NO">("YES"); // 0 = YES, 1 = NO
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get user's YES and NO shares for this outcome
  const { data: userYesShares } = useReadContract({
    address: FLIGHT_MARKET_CONTRACT_ADDRESS,
    abi: FlightMarketABI,
    functionName: "getUserPosition",
    args: [flightId as `0x${string}`, address as `0x${string}`, outcomeType, 0], // 0 = YES
  });

  const { data: userNoShares } = useReadContract({
    address: FLIGHT_MARKET_CONTRACT_ADDRESS,
    abi: FlightMarketABI,
    functionName: "getUserPosition",
    args: [flightId as `0x${string}`, address as `0x${string}`, outcomeType, 1], // 1 = NO
  });

  const currentPrice = position === "YES" ? yesPrice : noPrice;
  const userShares = position === "YES" ? userYesShares : userNoShares;

  // Set default price when position changes
  const handlePositionChange = (newPosition: "YES" | "NO") => {
    setPosition(newPosition);
    const defaultPrice = newPosition === "YES" ? yesPrice : noPrice;
    setPrice((defaultPrice * 100).toFixed(0));
  };

  // Calculate preview
  const priceInWei = price
    ? parseUnits((Number(price) / 100).toString(), 18)
    : 0n;
  const sharesInWei = shares ? parseUnits(shares, 18) : 0n;

  const { data: costOrPayout } = useReadContract({
    address: FLIGHT_MARKET_CONTRACT_ADDRESS,
    abi: FlightMarketABI,
    functionName: isBuying ? "calculateBuyCost" : "calculateSellPayout",
    args: shares && price ? [sharesInWei, priceInWei] : undefined,
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuy = async () => {
    if (!shares || !price) return;

    const sharesToBuy = parseUnits(shares, 18);
    const pricePerShare = parseUnits((Number(price) / 100).toString(), 18);
    const positionValue = position === "YES" ? 0 : 1;

    writeContract({
      address: FLIGHT_MARKET_CONTRACT_ADDRESS,
      abi: FlightMarketABI,
      functionName: "buyShares",
      args: [
        flightId as `0x${string}`,
        outcomeType,
        positionValue,
        sharesToBuy,
        pricePerShare,
      ],
    });
  };

  const handleSell = async () => {
    if (!shares || !price) return;

    const sharesToSell = parseUnits(shares, 18);
    const pricePerShare = parseUnits((Number(price) / 100).toString(), 18);
    const positionValue = position === "YES" ? 0 : 1;

    writeContract({
      address: FLIGHT_MARKET_CONTRACT_ADDRESS,
      abi: FlightMarketABI,
      functionName: "sellShares",
      args: [
        flightId as `0x${string}`,
        outcomeType,
        positionValue,
        sharesToSell,
        pricePerShare,
      ],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBuying) {
      await handleBuy();
    } else {
      await handleSell();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShares("");
    setPrice((currentPrice * 100).toFixed(0));
    reset();
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  };

  const handleOpenDialog = (buying: boolean) => {
    setIsBuying(buying);
    setIsOpen(true);
    // Set default position and price
    setPosition("YES");
    setPrice((yesPrice * 100).toFixed(0));
  };

  // Calculate potential profit for buying
  const potentialWinnings = shares ? parseUnits(shares, 18) : 0n;
  const potentialProfit =
    shares && price && costOrPayout && isBuying
      ? potentialWinnings - (costOrPayout as bigint)
      : 0n;

  const modalContent =
    isSuccess || isOpen ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
        onClick={handleClose}
      >
        <Card
          className="w-full max-w-md border-slate-700 bg-slate-800 shadow-2xl text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {isSuccess ? (
            <>
              <CardHeader>
                <CardTitle className="text-green-400">
                  ✓ Transaction Complete!
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Your {isBuying ? "purchase" : "sale"} was successful.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
                    <p className="text-xs text-gray-400">Transaction Hash</p>
                    <p className="break-all text-sm font-mono text-gray-200">
                      {hash}
                    </p>
                  </div>
                  <Button
                    onClick={handleClose}
                    className="w-full bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-white">
                  {isBuying ? "Buy" : "Sell"} Shares
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {flightNumber} - {outcomeName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Position Toggle (YES/NO) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Position
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handlePositionChange("YES")}
                        className={`flex-1 ${
                          position === "YES"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-slate-700 hover:bg-slate-600"
                        }`}
                      >
                        YES ({(yesPrice * 100).toFixed(0)}%)
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handlePositionChange("NO")}
                        className={`flex-1 ${
                          position === "NO"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-slate-700 hover:bg-slate-600"
                        }`}
                      >
                        NO ({(noPrice * 100).toFixed(0)}%)
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {position === "YES"
                        ? `Betting FOR ${outcomeName}`
                        : `Betting AGAINST ${outcomeName}`}
                    </p>
                  </div>

                  {!isBuying && userShares !== undefined && (
                    <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
                      <p className="text-xs text-gray-400">
                        Your {position} Shares
                      </p>
                      <p className="text-sm text-white">
                        {formatUnits(userShares as bigint, 18).substring(0, 10)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Number of Shares
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g., 10"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {isBuying ? "Max Price (%)" : "Min Price (%)"}
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="99"
                      required
                      placeholder={`e.g., ${(currentPrice * 100).toFixed(0)}`}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Price represents your belief about probability
                    </p>
                  </div>

                  {isBuying &&
                    costOrPayout !== undefined &&
                    shares &&
                    price && (
                      <div className="space-y-2">
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                          <p className="text-xs text-blue-300">
                            Cost to buy {shares} {position} shares at {price}%
                          </p>
                          <p className="text-lg font-semibold text-blue-200">
                            $
                            {formatUnits(costOrPayout as bigint, 18).substring(
                              0,
                              8
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <p className="text-xs text-emerald-300">
                            If you win (each share pays $1)
                          </p>
                          <p className="text-sm text-emerald-200">
                            Winnings: $
                            {formatUnits(potentialWinnings, 18).substring(0, 8)}
                          </p>
                          <p className="text-sm font-semibold text-emerald-200">
                            Profit: $
                            {formatUnits(potentialProfit, 18).substring(0, 8)}
                          </p>
                        </div>
                      </div>
                    )}

                  {!isBuying &&
                    costOrPayout !== undefined &&
                    shares &&
                    price && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                        <p className="text-xs text-blue-300">
                          You will receive
                        </p>
                        <p className="text-lg font-semibold text-blue-200">
                          $
                          {formatUnits(costOrPayout as bigint, 18).substring(
                            0,
                            8
                          )}
                        </p>
                      </div>
                    )}

                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <p className="text-sm text-red-400">
                        Error: {error.message.split("\n")[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleClose}
                      variant="outline"
                      className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700"
                      disabled={isPending || isConfirming}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                      disabled={isPending || isConfirming}
                    >
                      {isPending
                        ? "Confirming..."
                        : isConfirming
                        ? `${isBuying ? "Buying" : "Selling"}...`
                        : `${isBuying ? "Buy" : "Sell"} ${position} Shares`}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    ) : null;

  return (
    <>
      <div className="flex gap-1">
        <Button
          onClick={() => handleOpenDialog(true)}
          className="h-7 px-3 text-xs bg-blue-500 text-white hover:bg-blue-600"
        >
          BUY
        </Button>
        <Button
          variant="outline"
          onClick={() => handleOpenDialog(false)}
          className="h-7 px-3 text-xs border-slate-600 bg-transparent text-gray-300 hover:bg-slate-700"
        >
          SELL
        </Button>
      </div>
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
