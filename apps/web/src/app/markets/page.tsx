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
import FlightMarketABI from "../abi.json";

type OutcomeType = "ON_TIME" | "CANCELLED" | "DELAY_30" | "DELAY_120_PLUS";

type MarketOutcome = {
  type: OutcomeType;
  yesPrice: number;
  impliedProbability: number;
  totalShares: bigint;
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
  maximumFractionDigits: 0,
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
  const { data: flightsData, isLoading, error } = useReadContract({
    address: FLIGHT_MARKET_CONTRACT_ADDRESS,
    abi: FlightMarketABI,
    functionName: "getAllFlights",
  });

  // Transform contract data to FlightMarket format
  const markets: FlightMarket[] = useMemo(() => {
    if (!flightsData || !Array.isArray(flightsData)) return [];

    return (flightsData as any[]).map((flight) => {
      const totalOnTimeShares = BigInt(flight.totalOnTimeShares || 0);
      const totalCancelledShares = BigInt(flight.totalCancelledShares || 0);
      const totalDelayed30Shares = BigInt(flight.totalDelayed30Shares || 0);
      const totalDelayed120PlusShares = BigInt(flight.totalDelayed120PlusShares || 0);

      const totalShares = totalOnTimeShares + totalCancelledShares + totalDelayed30Shares + totalDelayed120PlusShares;
      const totalLiquidityValue = Number(formatUnits(totalShares, 18));

      // Parse the probabilities (they come as percentages with 2 decimal places, e.g., 2500 = 25.00%)
      const onTimeProbability = Number(flight.onTimeProbability || 0) / 100;
      const cancelledProbability = Number(flight.cancelledProbability || 0) / 100;
      const delayed30Probability = Number(flight.delayed30Probability || 0) / 100;
      const delayed120PlusProbability = Number(flight.delayed120PlusProbability || 0) / 100;

      const outcomes: MarketOutcome[] = [
        {
          type: "ON_TIME" as OutcomeType,
          yesPrice: onTimeProbability / 100,
          impliedProbability: onTimeProbability,
          totalShares: totalOnTimeShares,
        },
        {
          type: "CANCELLED" as OutcomeType,
          yesPrice: cancelledProbability / 100,
          impliedProbability: cancelledProbability,
          totalShares: totalCancelledShares,
        },
        {
          type: "DELAY_30" as OutcomeType,
          yesPrice: delayed30Probability / 100,
          impliedProbability: delayed30Probability,
          totalShares: totalDelayed30Shares,
        },
        {
          type: "DELAY_120_PLUS" as OutcomeType,
          yesPrice: delayed120PlusProbability / 100,
          impliedProbability: delayed120PlusProbability,
          totalShares: totalDelayed120PlusShares,
        },
      ];

      return {
        id: flight.flightId,
        flightNumber: flight.flightNumber,
        departureDate: flight.scheduledTime,
        route: `${flight.departureCode} → ${flight.destinationCode}`,
        totalLiquidity: totalLiquidityValue,
        airline: flight.airlineCode,
        outcomes: outcomes.filter(o => o.totalShares > 0n), // Only show outcomes with shares
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
          (outcomeSum, outcome) => outcomeSum + Number(formatUnits(outcome.totalShares, 18)),
          0
        ),
      0
    );
    const avgProbability =
      filteredMarkets.reduce(
        (sum, market) =>
          sum +
          market.outcomes.reduce(
            (outcomeSum, outcome) => outcomeSum + outcome.impliedProbability,
            0
          ) /
            (market.outcomes.length || 1),
        0
      ) / (filteredMarkets.length || 1);

    return {
      poolsActive: filteredMarkets.length,
      totalLiquidity: currency.format(liquidity),
      coverageDemand: currency.format(totalSharesCount),
      avgRisk: percent.format(avgProbability / 100),
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
                          Liquidity
                        </p>
                        <p className="text-base text-white">
                          {currency.format(market.totalLiquidity)}
                        </p>
                      </div>
                      {market.outcome > 0 && (
                        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm">
                          <p className="text-xs uppercase tracking-wide text-green-300">
                            Resolved
                          </p>
                          <p className="text-base text-green-200">
                            {market.outcome === 1 && "On Time"}
                            {market.outcome === 2 && "Cancelled"}
                            {market.outcome === 3 && "Delayed 30+"}
                            {market.outcome === 4 && "Delayed 120+"}
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

function OutcomeRow({ outcome }: { outcome: MarketOutcome }) {
  const [yesNo, setYesNo] = useState(true);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300 sm:text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-white">
        <span className="font-semibold">{outcomeLabels[outcome.type]}</span>
        <div className="flex items-center gap-2">
          <span className="text-sky-200 text-sm">
            {percent.format(outcome.impliedProbability / 100)}
          </span>
          <div className="flex gap-1">
            <Button
              className={`h-6 w-8 hover:border-sky-200 hover:bg-sky-200/10 ${
                yesNo
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "border-white/30 bg-transparent text-white"
              }`}
              size="icon"
              onClick={() => setYesNo(true)}
            >
              YES
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-6 w-8 hover:border-sky-200 hover:bg-sky-200/10 ${
                yesNo
                  ? "border-white/30 bg-transparent text-white"
                  : "bg-white text-slate-900 hover:bg-slate-100"
              }`}
              onClick={() => setYesNo(false)}
            >
              NO
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 sm:text-xs">
        <span>YES {currency.format(outcome.yesPrice)}</span>
        <span>Shares {formatUnits(outcome.totalShares, 18).substring(0, 8)}</span>
      </div>
    </div>
  );
}
