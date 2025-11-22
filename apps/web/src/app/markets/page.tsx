"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OutcomeType = "DELAY_30" | "DELAY_60" | "DELAY_90" | "CANCEL";

type MarketOutcome = {
  type: OutcomeType;
  yesPrice: number;
  impliedProbability: number;
  coverageDemand: number;
};

type FlightMarket = {
  id: string;
  flightNumber: string;
  departureDate: string;
  route: string;
  totalLiquidity: number;
  airline: string;
  outcomes: MarketOutcome[];
};

const outcomeLabels: Record<OutcomeType, string> = {
  DELAY_30: "30 min delay",
  DELAY_60: "60 min delay",
  DELAY_90: "90+ min delay",
  CANCEL: "Cancellation",
};

const marketsSeed: FlightMarket[] = [
  {
    id: "DL104-2024-12-01",
    flightNumber: "DL104",
    departureDate: "2024-12-01",
    route: "JFK → LAX",
    totalLiquidity: 32500,
    airline: "Delta",
    outcomes: [
      {
        type: "DELAY_30",
        yesPrice: 0.12,
        impliedProbability: 12,
        coverageDemand: 4200,
      },
      {
        type: "DELAY_60",
        yesPrice: 0.22,
        impliedProbability: 22,
        coverageDemand: 12800,
      },
      {
        type: "DELAY_90",
        yesPrice: 0.28,
        impliedProbability: 28,
        coverageDemand: 7600,
      },
      {
        type: "CANCEL",
        yesPrice: 0.36,
        impliedProbability: 36,
        coverageDemand: 5400,
      },
    ],
  },
  {
    id: "UA881-2024-12-02",
    flightNumber: "UA881",
    departureDate: "2024-12-02",
    route: "SFO → NRT",
    totalLiquidity: 41200,
    airline: "United",
    outcomes: [
      {
        type: "DELAY_30",
        yesPrice: 0.08,
        impliedProbability: 8,
        coverageDemand: 3100,
      },
      {
        type: "DELAY_60",
        yesPrice: 0.15,
        impliedProbability: 15,
        coverageDemand: 6400,
      },
      {
        type: "DELAY_90",
        yesPrice: 0.19,
        impliedProbability: 19,
        coverageDemand: 4100,
      },
      {
        type: "CANCEL",
        yesPrice: 0.17,
        impliedProbability: 17,
        coverageDemand: 9800,
      },
    ],
  },
  {
    id: "AF008-2024-12-03",
    flightNumber: "AF008",
    departureDate: "2024-12-03",
    route: "CDG → JFK",
    totalLiquidity: 28750,
    airline: "Air France",
    outcomes: [
      {
        type: "DELAY_30",
        yesPrice: 0.18,
        impliedProbability: 18,
        coverageDemand: 5400,
      },
      {
        type: "DELAY_60",
        yesPrice: 0.24,
        impliedProbability: 24,
        coverageDemand: 9600,
      },
      {
        type: "DELAY_90",
        yesPrice: 0.29,
        impliedProbability: 29,
        coverageDemand: 16500,
      },
      {
        type: "CANCEL",
        yesPrice: 0.34,
        impliedProbability: 34,
        coverageDemand: 8500,
      },
    ],
  },
  {
    id: "AA079-2024-12-03",
    flightNumber: "AA079",
    departureDate: "2024-12-03",
    route: "DFW → LHR",
    totalLiquidity: 19900,
    airline: "American",
    outcomes: [
      {
        type: "DELAY_30",
        yesPrice: 0.12,
        impliedProbability: 12,
        coverageDemand: 6200,
      },
      {
        type: "DELAY_60",
        yesPrice: 0.18,
        impliedProbability: 18,
        coverageDemand: 7200,
      },
      {
        type: "DELAY_90",
        yesPrice: 0.24,
        impliedProbability: 24,
        coverageDemand: 4700,
      },
      {
        type: "CANCEL",
        yesPrice: 0.32,
        impliedProbability: 32,
        coverageDemand: 3900,
      },
    ],
  },
  {
    id: "SQ025-2024-12-04",
    flightNumber: "SQ025",
    departureDate: "2024-12-04",
    route: "FRA → SIN",
    totalLiquidity: 35600,
    airline: "Singapore Airlines",
    outcomes: [
      {
        type: "DELAY_30",
        yesPrice: 0.09,
        impliedProbability: 9,
        coverageDemand: 4800,
      },
      {
        type: "DELAY_60",
        yesPrice: 0.14,
        impliedProbability: 14,
        coverageDemand: 6900,
      },
      {
        type: "DELAY_90",
        yesPrice: 0.2,
        impliedProbability: 20,
        coverageDemand: 5400,
      },
      {
        type: "CANCEL",
        yesPrice: 0.27,
        impliedProbability: 27,
        coverageDemand: 6200,
      },
    ],
  },
  {
    id: "EK202-2024-12-04",
    flightNumber: "EK202",
    departureDate: "2024-12-04",
    route: "JFK → DXB",
    totalLiquidity: 44100,
    airline: "Emirates",
    outcomes: [
      {
        type: "DELAY_30",
        yesPrice: 0.17,
        impliedProbability: 17,
        coverageDemand: 6800,
      },
      {
        type: "DELAY_60",
        yesPrice: 0.24,
        impliedProbability: 24,
        coverageDemand: 10400,
      },
      {
        type: "DELAY_90",
        yesPrice: 0.31,
        impliedProbability: 31,
        coverageDemand: 21200,
      },
      {
        type: "CANCEL",
        yesPrice: 0.36,
        impliedProbability: 36,
        coverageDemand: 15800,
      },
    ],
  },
];

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
  { label: "30 min delay", value: "DELAY_30" },
  { label: "60 min delay", value: "DELAY_60" },
  { label: "90+ min delay", value: "DELAY_90" },
  { label: "Cancellation", value: "CANCEL" },
];

export default function MarketsPage() {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | "ALL">(
    "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMarkets = useMemo(() => {
    return marketsSeed.filter((market) => {
      const matchesOutcome =
        selectedOutcome === "ALL" ||
        market.outcomes.some((outcome) => outcome.type === selectedOutcome);
      const matchesSearch =
        market.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.airline.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesOutcome && matchesSearch;
    });
  }, [selectedOutcome, searchTerm]);

  const aggregated = useMemo(() => {
    const liquidity = filteredMarkets.reduce(
      (sum, market) => sum + market.totalLiquidity,
      0
    );
    const coverage = filteredMarkets.reduce(
      (sum, market) =>
        sum +
        market.outcomes.reduce(
          (outcomeSum, outcome) => outcomeSum + outcome.coverageDemand,
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
            market.outcomes.length,
        0
      ) / (filteredMarkets.length || 1);

    return {
      poolsActive: filteredMarkets.length,
      totalLiquidity: currency.format(liquidity),
      coverageDemand: currency.format(coverage),
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
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <div className="space-y-2">
                  {market.outcomes.map((outcome) => (
                    <div
                      key={`${market.id}-${outcome.type}`}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300 sm:text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 text-white">
                        <span className="font-semibold">
                          {outcomeLabels[outcome.type]}
                        </span>
                        <span className="text-sky-200">
                          {percent.format(outcome.impliedProbability / 100)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          className="flex-1 bg-white text-slate-900 hover:bg-slate-100"
                          size="sm"
                        >
                          Buy YES
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-white/30 bg-transparent text-white hover:border-sky-200 hover:bg-sky-200/10"
                        >
                          Buy NO
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 sm:text-xs">
                        <span>YES {currency.format(outcome.yesPrice)}</span>
                        <span>Coverage {currency.format(outcome.coverageDemand)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    asChild
                    className="flex-1 bg-white text-slate-900 hover:bg-slate-100"
                  >
                    <Link
                      href={`/bet?flight=${market.flightNumber}&date=${market.departureDate}`}
                    >
                      Request coverage
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:border-sky-200 hover:bg-sky-200/10"
                  >
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
