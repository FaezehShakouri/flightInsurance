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

const price = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const kpiTiles = [
  { label: "Pools active", detail: "within next 48h", icon: "🛫" },
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

  // Fetch flight data from the contract
  const { data: flightsData, isLoading, error, refetch } = useReadContract({
    address: FLIGHT_MARKET_CONTRACT_ADDRESS,
    abi: FlightMarketABI,
    functionName: "getAllFlights",
  });

  // Refetch markets when a new one is created
  const handleMarketCreated = () => {
    refetch();
  };

  // Transform contract data to FlightMarket format
  const markets: FlightMarket[] = useMemo(() => {
    if (!flightsData || !Array.isArray(flightsData)) return [];

    return (flightsData as any[]).map((flight) => {
      // New structure has onTime, delayed30, delayed120Plus, cancelled objects
      // Each has: yesShares, noShares, yesPrice, noPrice
      const onTime = flight.onTime || { yesShares: 0n, noShares: 0n, yesPrice: 0n, noPrice: 0n };
      const delayed30 = flight.delayed30 || { yesShares: 0n, noShares: 0n, yesPrice: 0n, noPrice: 0n };
      const delayed120Plus = flight.delayed120Plus || { yesShares: 0n, noShares: 0n, yesPrice: 0n, noPrice: 0n };
      const cancelled = flight.cancelled || { yesShares: 0n, noShares: 0n, yesPrice: 0n, noPrice: 0n };

      const totalShares = 
        BigInt(onTime.yesShares || 0) + BigInt(onTime.noShares || 0) +
        BigInt(delayed30.yesShares || 0) + BigInt(delayed30.noShares || 0) +
        BigInt(delayed120Plus.yesShares || 0) + BigInt(delayed120Plus.noShares || 0) +
        BigInt(cancelled.yesShares || 0) + BigInt(cancelled.noShares || 0);
      
      const totalLiquidityValue = Number(formatUnits(totalShares, 18));

      // Parse YES prices (scaled by 1e18)
      const onTimeYesPrice = Number(formatUnits(BigInt(onTime.yesPrice || 0), 18));
      const delayed30YesPrice = Number(formatUnits(BigInt(delayed30.yesPrice || 0), 18));
      const delayed120YesPrice = Number(formatUnits(BigInt(delayed120Plus.yesPrice || 0), 18));
      const cancelledYesPrice = Number(formatUnits(BigInt(cancelled.yesPrice || 0), 18));

      // Parse NO prices (scaled by 1e18)
      const onTimeNoPrice = Number(formatUnits(BigInt(onTime.noPrice || 0), 18));
      const delayed30NoPrice = Number(formatUnits(BigInt(delayed30.noPrice || 0), 18));
      const delayed120NoPrice = Number(formatUnits(BigInt(delayed120Plus.noPrice || 0), 18));
      const cancelledNoPrice = Number(formatUnits(BigInt(cancelled.noPrice || 0), 18));

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
          (outcomeSum, outcome) => outcomeSum + Number(formatUnits(outcome.yesShares + outcome.noShares, 18)),
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
    <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 py-12 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4">
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-300">
            SkyShield | coverage pools
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Active flight prediction markets
          </h1>
          <p className="text-base text-slate-200">
            Monitor every delay and cancellation pool that the AMM currently
            underwrites. Filter by trigger or search by flight, route, or
            airline to find the market you need.
          </p>
          <div className="flex justify-center pt-4">
            <CreateFlightMarketDialog onSuccess={handleMarketCreated} />
          </div>
        </header>

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-slate-300 text-lg">Loading flight markets...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg">Error loading markets: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpiTiles.map((tile, index) => (
                <div
                  key={tile.label}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-5 text-center shadow-lg shadow-black/40"
                >
                  <span className="text-lg">{tile.icon}</span>
                  <p className="mt-2 text-3xl font-semibold">
                    {kpiValues[index] || "--"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    {tile.label}
                  </p>
                  <p className="text-xs text-slate-400">{tile.detail}</p>
                </div>
              ))}
            </div>

            <Card className="border-white/10 bg-white/5 text-white shadow-2xl shadow-black/30">
              <CardHeader>
                <CardTitle>Filter pools</CardTitle>
                <CardDescription className="text-slate-300">
                  Narrow the runway by trigger type or search specific flights.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex flex-wrap gap-2">
                    {outcomeFilters.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setSelectedOutcome(filter.value)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          selectedOutcome === filter.value
                            ? "border-sky-300 bg-sky-500/20 text-white"
                            : "border-white/20 text-slate-200 hover:border-sky-200/60 hover:text-white"
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
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredMarkets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-300 text-lg">No markets found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMarkets.map((market) => (
                  <Card
                    key={market.id}
                    className="flex h-full flex-col border-white/10 bg-white/5 text-white shadow-xl shadow-black/40"
                  >
                    <CardHeader className="flex flex-col gap-4">
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide">
                          {market.airline}
                        </span>
                        <span className="text-xs text-slate-400">
                          {market.departureDate}
                        </span>
                      </div>
                      <div>
                        <p className="text-3xl font-semibold">
                          {market.flightNumber}
                        </p>
                        <p className="text-sm text-slate-300">{market.route}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {market.totalLiquidity === 0 ? "Status" : "Liquidity"}
                        </p>
                        <p className="text-base text-white">
                          {market.totalLiquidity === 0 
                            ? "📊 New Market" 
                            : currency.format(market.totalLiquidity)}
                        </p>
                      </div>
                      {market.outcome > 0 && (
                        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm">
                          <p className="text-xs uppercase tracking-wide text-green-300">
                            Resolved
                          </p>
                          <p className="text-base text-green-200">
                            {market.outcome === 1 && "On Time"}
                            {market.outcome === 2 && "Delayed 30+"}
                            {market.outcome === 3 && "Delayed 120+"}
                            {market.outcome === 4 && "Cancelled"}
                          </p>
                        </div>
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
  onSuccess 
}: { 
  outcome: MarketOutcome;
  flightId: string;
  flightNumber: string;
  onSuccess?: () => void;
}) {
  const hasYesShares = outcome.yesShares > 0n;
  const hasNoShares = outcome.noShares > 0n;
  const hasAnyShares = hasYesShares || hasNoShares;
  const totalShares = outcome.yesShares + outcome.noShares;
  
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300 sm:text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-white">{outcomeLabels[outcome.type]}</span>
        {hasAnyShares ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-emerald-300">YES {percent.format(outcome.yesPrice)}</div>
              <div className="text-xs text-red-300">NO {percent.format(outcome.noPrice)}</div>
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
            <span className="text-xs text-slate-400">No shares yet</span>
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
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 sm:text-xs">
        <span>
          {hasAnyShares ? (
            <>
              <span className="text-emerald-400">YES: {formatUnits(outcome.yesShares, 18).substring(0, 6)}</span>
              {" / "}
              <span className="text-red-400">NO: {formatUnits(outcome.noShares, 18).substring(0, 6)}</span>
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
