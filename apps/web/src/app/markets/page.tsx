"use client";

import { useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FLIGHT_MARKET_CONTRACT_ADDRESS } from "@/lib/contract";
import { CreateFlightMarketDialog } from "@/components/create-flight-market-dialog";
import { BuySellSharesDialog } from "@/components/buy-sell-shares-dialog";
import FlightMarketABI from "../abi.json";

// Oasis API endpoint
const OASIS_API_URL =
  process.env.NEXT_PUBLIC_OASIS_API_URL || "http://localhost:4500";

type OutcomeType = "ON_TIME" | "CANCELLED" | "DELAY_30" | "DELAY_120_PLUS";

type MarketOutcome = {
  type: OutcomeType;
  yesPrice: number;
  noPrice: number;
  impliedProbability: number;
  yesShares: bigint;
  noShares: bigint;
  outcomeIndex: number; // 1=ON_TIME, 2=DELAY_30, 3=DELAY_120_PLUS, 4=CANCELLED
};

type FlightMarket = {
  id: string;
  flightNumber: string;
  departureDate: string;
  route: string;
  totalLiquidity: number;
  airline: string;
  outcomes: MarketOutcome[];
  outcome: number; // 0 = pending, 1 = on time, 2 = cancelled, 3 = delayed 30, 4 = delayed 120+
};

const outcomeLabels: Record<OutcomeType, string> = {
  ON_TIME: "On Time",
  CANCELLED: "Cancellation",
  DELAY_30: "30+ min delay",
  DELAY_120_PLUS: "120+ min delay",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const kpiTiles = [
  { label: "Pools active", detail: "within next 48h", icon: "✈️" },
  { label: "Total liquidity", detail: "locked in USDC", icon: "💧" },
  { label: "Coverage demand", detail: "policy requests", icon: "🛡️" },
  { label: "Avg. risk quote", detail: "implied probability", icon: "⚖️" },
];

const outcomeFilters: Array<{ label: string; value: OutcomeType | "ALL" }> = [
  { label: "All triggers", value: "ALL" },
  { label: "On Time", value: "ON_TIME" },
  { label: "30+ min delay", value: "DELAY_30" },
  { label: "120+ min delay", value: "DELAY_120_PLUS" },
  { label: "Cancellation", value: "CANCELLED" },
];

export default function MarketsPage() {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | "ALL">(
    "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [resolvingMarket, setResolvingMarket] = useState<string | null>(null);

  // Fetch flight data from the contract
  const {
    data: flightsData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: FLIGHT_MARKET_CONTRACT_ADDRESS,
    abi: FlightMarketABI,
    functionName: "getAllFlights",
  });

  // Refetch markets when a new one is created
  const handleMarketCreated = () => {
    refetch();
  };

  // Resolve market function
  const handleResolveMarket = async (market: FlightMarket) => {
    setResolvingMarket(market.id);

    try {
      // Call Oasis API to resolve the market
      const url = new URL(`${OASIS_API_URL}/resolve`);
      url.searchParams.append("flightId", market.id);
      url.searchParams.append("departureCode", market.route.split(" → ")[0]);
      url.searchParams.append("date", market.departureDate);
      url.searchParams.append("airlineCode", market.airline);
      url.searchParams.append("flightNumber", market.flightNumber);
      url.searchParams.append("chain", "C"); // S for Sepolia, C for Celo

      console.log("Resolving market:", url.toString());

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resolve market");
      }

      console.log("Market resolved:", data);
      alert(
        `Market resolved! Outcome: ${data.outcome}\nTx Hash: ${
          data.blockchain?.txHash || "N/A"
        }`
      );

      // Wait a bit for blockchain confirmation then refetch
      setTimeout(() => {
        refetch();
      }, 3000);
    } catch (error) {
      console.error("Error resolving market:", error);
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to resolve market"
        }`
      );
    } finally {
      setResolvingMarket(null);
    }
  };

  // Transform contract data to FlightMarket format
  const markets: FlightMarket[] = useMemo(() => {
    if (!flightsData || !Array.isArray(flightsData)) return [];

    return (flightsData as any[]).map((flight) => {
      // New structure has onTime, delayed30, delayed120Plus, cancelled objects
      // Each has: yesShares, noShares, yesPrice, noPrice
      const onTime = flight.onTime || {
        yesShares: 0n,
        noShares: 0n,
        yesPrice: 0n,
        noPrice: 0n,
      };
      const delayed30 = flight.delayed30 || {
        yesShares: 0n,
        noShares: 0n,
        yesPrice: 0n,
        noPrice: 0n,
      };
      const delayed120Plus = flight.delayed120Plus || {
        yesShares: 0n,
        noShares: 0n,
        yesPrice: 0n,
        noPrice: 0n,
      };
      const cancelled = flight.cancelled || {
        yesShares: 0n,
        noShares: 0n,
        yesPrice: 0n,
        noPrice: 0n,
      };

      const totalShares =
        BigInt(onTime.yesShares || 0) +
        BigInt(onTime.noShares || 0) +
        BigInt(delayed30.yesShares || 0) +
        BigInt(delayed30.noShares || 0) +
        BigInt(delayed120Plus.yesShares || 0) +
        BigInt(delayed120Plus.noShares || 0) +
        BigInt(cancelled.yesShares || 0) +
        BigInt(cancelled.noShares || 0);

      const totalLiquidityValue = Number(formatUnits(totalShares, 18));

      // Parse YES prices (scaled by 1e18)
      const onTimeYesPrice = Number(
        formatUnits(BigInt(onTime.yesPrice || 0), 18)
      );
      const delayed30YesPrice = Number(
        formatUnits(BigInt(delayed30.yesPrice || 0), 18)
      );
      const delayed120YesPrice = Number(
        formatUnits(BigInt(delayed120Plus.yesPrice || 0), 18)
      );
      const cancelledYesPrice = Number(
        formatUnits(BigInt(cancelled.yesPrice || 0), 18)
      );

      // Parse NO prices (scaled by 1e18)
      const onTimeNoPrice = Number(
        formatUnits(BigInt(onTime.noPrice || 0), 18)
      );
      const delayed30NoPrice = Number(
        formatUnits(BigInt(delayed30.noPrice || 0), 18)
      );
      const delayed120NoPrice = Number(
        formatUnits(BigInt(delayed120Plus.noPrice || 0), 18)
      );
      const cancelledNoPrice = Number(
        formatUnits(BigInt(cancelled.noPrice || 0), 18)
      );

      const outcomes: MarketOutcome[] = [
        {
          type: "ON_TIME" as OutcomeType,
          yesPrice: onTimeYesPrice,
          noPrice: onTimeNoPrice,
          impliedProbability: onTimeYesPrice * 100,
          yesShares: BigInt(onTime.yesShares || 0),
          noShares: BigInt(onTime.noShares || 0),
          outcomeIndex: 1,
        },
        {
          type: "DELAY_30" as OutcomeType,
          yesPrice: delayed30YesPrice,
          noPrice: delayed30NoPrice,
          impliedProbability: delayed30YesPrice * 100,
          yesShares: BigInt(delayed30.yesShares || 0),
          noShares: BigInt(delayed30.noShares || 0),
          outcomeIndex: 2,
        },
        {
          type: "DELAY_120_PLUS" as OutcomeType,
          yesPrice: delayed120YesPrice,
          noPrice: delayed120NoPrice,
          impliedProbability: delayed120YesPrice * 100,
          yesShares: BigInt(delayed120Plus.yesShares || 0),
          noShares: BigInt(delayed120Plus.noShares || 0),
          outcomeIndex: 3,
        },
        {
          type: "CANCELLED" as OutcomeType,
          yesPrice: cancelledYesPrice,
          noPrice: cancelledNoPrice,
          impliedProbability: cancelledYesPrice * 100,
          yesShares: BigInt(cancelled.yesShares || 0),
          noShares: BigInt(cancelled.noShares || 0),
          outcomeIndex: 4,
        },
      ];

      return {
        id: flight.flightId,
        flightNumber: flight.flightNumber,
        departureDate: flight.scheduledTime,
        route: `${flight.departureCode} → ${flight.destinationCode}`,
        totalLiquidity: totalLiquidityValue,
        airline: flight.airlineCode,
        outcomes: outcomes,
        outcome: Number(flight.outcome || 0),
      };
    });
  }, [flightsData]);

  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const matchesOutcome =
        selectedOutcome === "ALL" ||
        market.outcomes.some((outcome) => outcome.type === selectedOutcome);
      const matchesSearch =
        market.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.airline.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesOutcome && matchesSearch;
    });
  }, [markets, selectedOutcome, searchTerm]);

  const aggregated = useMemo(() => {
    const liquidity = filteredMarkets.reduce(
      (sum, market) => sum + market.totalLiquidity,
      0
    );
    const totalSharesCount = filteredMarkets.reduce(
      (sum, market) =>
        sum +
        market.outcomes.reduce(
          (outcomeSum, outcome) =>
            outcomeSum +
            Number(formatUnits(outcome.yesShares + outcome.noShares, 18)),
          0
        ),
      0
    );
    const avgProbability =
      filteredMarkets.reduce(
        (sum, market) =>
          sum +
          market.outcomes.reduce(
            (outcomeSum, outcome) => outcomeSum + outcome.yesPrice,
            0
          ) /
            (market.outcomes.length || 1),
        0
      ) / (filteredMarkets.length || 1);

    return {
      poolsActive: filteredMarkets.length,
      totalLiquidity: currency.format(liquidity),
      coverageDemand: currency.format(totalSharesCount),
      avgRisk: percent.format(avgProbability),
    };
  }, [filteredMarkets]);

  const kpiValues = [
    aggregated.poolsActive,
    aggregated.totalLiquidity,
    aggregated.coverageDemand,
    aggregated.avgRisk,
  ];

  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4">
        <header className="text-center space-y-4">
          <div className="text-5xl mb-2">✈️</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Flight Markets
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Bet on flight delays and cancellations. Pick a flight and start
            trading!
          </p>
          <div className="flex justify-center pt-4">
            <CreateFlightMarketDialog onSuccess={handleMarketCreated} />
          </div>
        </header>

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300 text-lg">Loading markets...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg">
              Error loading markets: {error.message}
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpiTiles.map((tile, index) => (
                <div
                  key={tile.label}
                  className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 px-4 py-5 text-center shadow-lg"
                >
                  <span className="text-2xl">{tile.icon}</span>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {kpiValues[index] || "--"}
                  </p>
                  <p className="text-xs font-medium text-gray-300 mt-1">
                    {tile.label}
                  </p>
                  <p className="text-xs text-gray-400">{tile.detail}</p>
                </div>
              ))}
            </div>

            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-xl text-white">
              <CardHeader>
                <CardTitle className="text-white">Search Flights</CardTitle>
                <CardDescription className="text-gray-300">
                  Filter by outcome type or search for specific flights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex flex-wrap gap-2">
                    {outcomeFilters.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setSelectedOutcome(filter.value)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          selectedOutcome === filter.value
                            ? "border-blue-400 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                            : "border-slate-600 text-gray-300 hover:border-blue-400/50 hover:bg-slate-700"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search flight, route, or airline"
                      className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredMarkets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-300 text-lg">
                  No markets found. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMarkets.map((market) => (
                  <Card
                    key={market.id}
                    className="flex h-full flex-col border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all text-white"
                  >
                    <CardHeader className="flex flex-col gap-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 text-xs font-semibold uppercase">
                          {market.airline}
                        </span>
                        <span className="text-xs text-gray-400">
                          {market.departureDate}
                        </span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-white">
                          {market.flightNumber}
                        </p>
                        <p className="text-sm text-gray-300">{market.route}</p>
                      </div>
                      <div className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm">
                        <p className="text-xs font-medium text-gray-400">
                          {market.totalLiquidity === 0 ? "Status" : "Liquidity"}
                        </p>
                        <p className="text-base font-semibold text-white">
                          {market.totalLiquidity === 0
                            ? "📊 New Market"
                            : currency.format(market.totalLiquidity)}
                        </p>
                      </div>
                      {market.outcome > 0 && (
                        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm">
                          <p className="text-xs font-medium text-green-300">
                            Resolved
                          </p>
                          <p className="text-base font-semibold text-green-200">
                            {market.outcome === 1 && "On Time"}
                            {market.outcome === 2 && "Delayed 30+"}
                            {market.outcome === 3 && "Delayed 120+"}
                            {market.outcome === 4 && "Cancelled"}
                          </p>
                        </div>
                      )}
                      {market.outcome === 0 && (
                        <Button
                          onClick={() => handleResolveMarket(market)}
                          disabled={resolvingMarket === market.id}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                        >
                          {resolvingMarket === market.id
                            ? "Resolving..."
                            : "🔍 Resolve Market"}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col space-y-4">
                      <div className="space-y-2">
                        {market.outcomes.map((outcome) => (
                          <OutcomeRow
                            key={`${market.id}-${outcome.type}`}
                            outcome={outcome}
                            flightId={market.id}
                            flightNumber={market.flightNumber}
                            isResolved={market.outcome > 0}
                            onSuccess={handleMarketCreated}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function OutcomeRow({
  outcome,
  flightId,
  flightNumber,
  isResolved = false,
  onSuccess,
}: {
  outcome: MarketOutcome;
  flightId: string;
  flightNumber: string;
  isResolved?: boolean;
  onSuccess?: () => void;
}) {
  const hasYesShares = outcome.yesShares > 0n;
  const hasNoShares = outcome.noShares > 0n;
  const hasAnyShares = hasYesShares || hasNoShares;
  const totalShares = outcome.yesShares + outcome.noShares;

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-3 text-xs sm:text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-white">
          {outcomeLabels[outcome.type]}
        </span>
        {isResolved ? (
          <div className="flex items-center gap-2">
            {hasAnyShares && (
              <div className="text-right">
                <div className="text-xs text-emerald-400 font-medium">
                  YES {percent.format(outcome.yesPrice)}
                </div>
                <div className="text-xs text-red-400 font-medium">
                  NO {percent.format(outcome.noPrice)}
                </div>
              </div>
            )}
            <div className="px-3 py-1 rounded-md bg-slate-600 text-gray-300 text-xs font-medium">
              Resolved
            </div>
          </div>
        ) : hasAnyShares ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-emerald-400 font-medium">
                YES {percent.format(outcome.yesPrice)}
              </div>
              <div className="text-xs text-red-400 font-medium">
                NO {percent.format(outcome.noPrice)}
              </div>
            </div>
            <BuySellSharesDialog
              flightId={flightId}
              flightNumber={flightNumber}
              outcomeType={outcome.outcomeIndex}
              outcomeName={outcomeLabels[outcome.type]}
              yesPrice={outcome.yesPrice}
              noPrice={outcome.noPrice}
              onSuccess={onSuccess}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">No shares yet</span>
            <BuySellSharesDialog
              flightId={flightId}
              flightNumber={flightNumber}
              outcomeType={outcome.outcomeIndex}
              outcomeName={outcomeLabels[outcome.type]}
              yesPrice={outcome.yesPrice}
              noPrice={outcome.noPrice}
              onSuccess={onSuccess}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 sm:text-xs">
        <span>
          {hasAnyShares ? (
            <>
              <span className="text-emerald-400">
                YES: {formatUnits(outcome.yesShares, 18).substring(0, 6)}
              </span>
              {" / "}
              <span className="text-red-400">
                NO: {formatUnits(outcome.noShares, 18).substring(0, 6)}
              </span>
            </>
          ) : (
            "No positions yet"
          )}
        </span>
        <span>
          {hasAnyShares ? (
            <>Total: {formatUnits(totalShares, 18).substring(0, 8)} shares</>
          ) : (
            "Place first order"
          )}
        </span>
      </div>
    </div>
  );
}
